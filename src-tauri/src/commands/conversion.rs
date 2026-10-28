use crate::core::error::RelayError;
use crate::core::format::SupportedFormat;
use crate::core::inspector::{FileInspector, FileMetadata};
use crate::core::output_manager::{CollisionStrategy, OutputManager};
use crate::engines::data_engine::NativeDataEngine;
use crate::engines::image_engine::{ImageConversionOptions, NativeImageEngine};
use crate::engines::pdf_engine::{NativePdfEngine, PdfInfo};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionPayload {
    pub input_path: String,
    pub output_path: Option<String>,
    pub options: ImageConversionOptions,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CsvToJsonPayload {
    pub input_path: String,
    pub output_path: Option<String>,
    pub delimiter: Option<char>,
    pub pretty: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonToCsvPayload {
    pub input_path: String,
    pub output_path: Option<String>,
    pub delimiter: Option<char>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfMergePayload {
    pub input_paths: Vec<String>,
    pub output_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfRotatePayload {
    pub input_path: String,
    pub output_path: Option<String>,
    pub angle: i32,
    pub pages: Option<Vec<u32>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExtractPayload {
    pub input_path: String,
    pub output_path: Option<String>,
    pub pages: Vec<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfSplitPayload {
    pub input_path: String,
    pub output_dir: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagesToPdfPayload {
    pub input_paths: Vec<String>,
    pub output_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionResult {
    pub success: bool,
    pub output_path: String,
    pub bytes_written: u64,
    pub duration_ms: u64,
    pub error_message: Option<String>,
}

#[tauri::command]
pub fn inspect_file(path: String) -> Result<FileMetadata, RelayError> {
    FileInspector::inspect(Path::new(&path))
}

#[tauri::command]
pub async fn convert_image(payload: ImageConversionPayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    let input_path = Path::new(&payload.input_path);

    if !input_path.exists() {
        return Err(RelayError::InspectionFailed(format!(
            "Input file does not exist: {}",
            input_path.display()
        )));
    }

    let custom_output_dir = payload.output_path.as_deref().map(Path::new);
    let target_format = payload.options.target_format;

    // Resolve safe output path using collision rules
    let final_output_path = OutputManager::resolve_output_path(
        input_path,
        custom_output_dir,
        target_format,
        CollisionStrategy::Rename,
    )?;

    // Create temporary staging path
    let staging_path = OutputManager::create_staging_path(&final_output_path);

    // Execute conversion in pure Rust engine
    let engine = NativeImageEngine::new();
    if let Err(err) = engine.convert(input_path, &staging_path, &payload.options) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    // Verify output and atomically promote
    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        target_format,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub fn inspect_pdf(path: String) -> Result<PdfInfo, RelayError> {
    NativePdfEngine::get_info(Path::new(&path))
}

#[tauri::command]
pub async fn merge_pdfs(payload: PdfMergePayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    if payload.input_paths.len() < 2 {
        return Err(RelayError::ConversionFailed(
            "At least 2 PDF files are required for merging".to_string(),
        ));
    }

    let input_path_bufs: Vec<PathBuf> = payload.input_paths.iter().map(PathBuf::from).collect();
    for p in &input_path_bufs {
        if !p.exists() {
            return Err(RelayError::InspectionFailed(format!(
                "PDF file does not exist: {}",
                p.display()
            )));
        }
    }

    let base_path = &input_path_bufs[0];
    let custom_output_dir = payload.output_path.as_deref().map(Path::new);

    let final_output_path = OutputManager::resolve_output_path(
        base_path,
        custom_output_dir,
        SupportedFormat::Pdf,
        CollisionStrategy::Rename,
    )?;

    let staging_path = OutputManager::create_staging_path(&final_output_path);

    if let Err(err) = NativePdfEngine::merge(&input_path_bufs, &staging_path) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        SupportedFormat::Pdf,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub async fn rotate_pdf(payload: PdfRotatePayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    let input_path = Path::new(&payload.input_path);
    if !input_path.exists() {
        return Err(RelayError::InspectionFailed(format!(
            "Input file does not exist: {}",
            input_path.display()
        )));
    }

    let custom_output_dir = payload.output_path.as_deref().map(Path::new);
    let final_output_path = OutputManager::resolve_output_path(
        input_path,
        custom_output_dir,
        SupportedFormat::Pdf,
        CollisionStrategy::Rename,
    )?;

    let staging_path = OutputManager::create_staging_path(&final_output_path);

    if let Err(err) = NativePdfEngine::rotate(
        input_path,
        &staging_path,
        payload.angle,
        payload.pages.as_deref(),
    ) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        SupportedFormat::Pdf,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub async fn extract_pdf_pages(payload: PdfExtractPayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    let input_path = Path::new(&payload.input_path);
    if !input_path.exists() {
        return Err(RelayError::InspectionFailed(format!(
            "Input file does not exist: {}",
            input_path.display()
        )));
    }

    let custom_output_dir = payload.output_path.as_deref().map(Path::new);
    let final_output_path = OutputManager::resolve_output_path(
        input_path,
        custom_output_dir,
        SupportedFormat::Pdf,
        CollisionStrategy::Rename,
    )?;

    let staging_path = OutputManager::create_staging_path(&final_output_path);

    if let Err(err) = NativePdfEngine::extract_pages(
        input_path,
        &staging_path,
        &payload.pages,
    ) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        SupportedFormat::Pdf,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub async fn split_pdf(payload: PdfSplitPayload) -> Result<Vec<String>, RelayError> {
    let input_path = Path::new(&payload.input_path);
    if !input_path.exists() {
        return Err(RelayError::InspectionFailed(format!(
            "Input file does not exist: {}",
            input_path.display()
        )));
    }

    let parent_dir = payload
        .output_dir
        .as_deref()
        .map(PathBuf::from)
        .or_else(|| input_path.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let created_files = NativePdfEngine::split_all_pages(input_path, &parent_dir)?;

    Ok(created_files
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
pub async fn convert_images_to_pdf(payload: ImagesToPdfPayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    if payload.input_paths.is_empty() {
        return Err(RelayError::ConversionFailed(
            "At least one image path must be provided".to_string(),
        ));
    }

    let input_path_bufs: Vec<PathBuf> = payload.input_paths.iter().map(PathBuf::from).collect();
    for p in &input_path_bufs {
        if !p.exists() {
            return Err(RelayError::InspectionFailed(format!(
                "Image file does not exist: {}",
                p.display()
            )));
        }
    }

    let base_path = &input_path_bufs[0];
    let custom_output_dir = payload.output_path.as_deref().map(Path::new);

    let final_output_path = OutputManager::resolve_output_path(
        base_path,
        custom_output_dir,
        SupportedFormat::Pdf,
        CollisionStrategy::Rename,
    )?;

    let staging_path = OutputManager::create_staging_path(&final_output_path);

    if let Err(err) = NativePdfEngine::images_to_pdf(&input_path_bufs, &staging_path) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        SupportedFormat::Pdf,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub async fn convert_csv_to_json(payload: CsvToJsonPayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    let input_path = Path::new(&payload.input_path);
    if !input_path.exists() {
        return Err(RelayError::InspectionFailed(format!(
            "Input CSV file does not exist: {}",
            input_path.display()
        )));
    }

    let custom_output_dir = payload.output_path.as_deref().map(Path::new);
    let final_output_path = OutputManager::resolve_output_path(
        input_path,
        custom_output_dir,
        SupportedFormat::Json,
        CollisionStrategy::Rename,
    )?;

    let staging_path = OutputManager::create_staging_path(&final_output_path);
    let delimiter = payload.delimiter.unwrap_or(',');
    let pretty = payload.pretty.unwrap_or(true);

    if let Err(err) = NativeDataEngine::csv_to_json(input_path, &staging_path, delimiter, pretty) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        SupportedFormat::Json,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub async fn convert_json_to_csv(payload: JsonToCsvPayload) -> Result<ConversionResult, RelayError> {
    let start_time = Instant::now();
    let input_path = Path::new(&payload.input_path);
    if !input_path.exists() {
        return Err(RelayError::InspectionFailed(format!(
            "Input JSON file does not exist: {}",
            input_path.display()
        )));
    }

    let custom_output_dir = payload.output_path.as_deref().map(Path::new);
    let final_output_path = OutputManager::resolve_output_path(
        input_path,
        custom_output_dir,
        SupportedFormat::Csv,
        CollisionStrategy::Rename,
    )?;

    let staging_path = OutputManager::create_staging_path(&final_output_path);
    let delimiter = payload.delimiter.unwrap_or(',');

    if let Err(err) = NativeDataEngine::json_to_csv(input_path, &staging_path, delimiter) {
        let _ = std::fs::remove_file(&staging_path);
        return Err(err);
    }

    let bytes_written = match OutputManager::commit_staged_file(
        &staging_path,
        &final_output_path,
        SupportedFormat::Csv,
    ) {
        Ok(bytes) => bytes,
        Err(err) => {
            let _ = std::fs::remove_file(&staging_path);
            return Err(err);
        }
    };

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(ConversionResult {
        success: true,
        output_path: final_output_path.to_string_lossy().to_string(),
        bytes_written,
        duration_ms,
        error_message: None,
    })
}

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), RelayError> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(RelayError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Path does not exist",
        )));
    }

    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("explorer");
        if p.is_file() {
            cmd.arg("/select,").arg(p);
        } else {
            cmd.arg(p);
        }
        let _ = cmd.spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("open");
        if p.is_file() {
            cmd.arg("-R").arg(p);
        } else {
            cmd.arg(p);
        }
        let _ = cmd.spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let target = if p.is_file() {
            p.parent().unwrap_or(&p).to_path_buf()
        } else {
            p
        };
        let _ = Command::new("xdg-open").arg(target).spawn();
    }

    Ok(())
}
