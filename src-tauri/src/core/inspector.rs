use super::error::RelayError;
use super::format::SupportedFormat;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub size_bytes: u64,
    pub detected_format: SupportedFormat,
    pub mime_type: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub page_count: Option<u32>,
    pub is_valid: bool,
    pub validation_error: Option<String>,
}

pub struct FileInspector;

impl FileInspector {
    pub fn inspect<P: AsRef<Path>>(file_path: P) -> Result<FileMetadata, RelayError> {
        let path = file_path.as_ref();

        if !path.exists() {
            return Err(RelayError::InspectionFailed(format!(
                "File does not exist: {}",
                path.display()
            )));
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let metadata = std::fs::metadata(path).map_err(RelayError::Io)?;
        let size_bytes = metadata.len();

        let mut file = File::open(path).map_err(RelayError::Io)?;
        let mut header = [0u8; 512];
        let bytes_read = file.read(&mut header).unwrap_or(0);

        let mut detected_format = SupportedFormat::from_magic_bytes(&header[..bytes_read]);

        // If magic bytes returned unknown, fallback to extension detection (e.g. for CSV/JSON)
        if detected_format == SupportedFormat::Unknown {
            detected_format = SupportedFormat::from_path(path);
        }

        let mime_type = detected_format.mime_type().to_string();
        let mut width = None;
        let mut height = None;

        // If it is an image, attempt header-only dimension inspection
        if detected_format.is_image() && size_bytes > 0 {
            if let Ok(reader) = image::ImageReader::open(path) {
                if let Ok(dimensions) = reader.into_dimensions() {
                    width = Some(dimensions.0);
                    height = Some(dimensions.1);
                }
            }
        }

        Ok(FileMetadata {
            path: path.to_string_lossy().to_string(),
            name,
            size_bytes,
            detected_format,
            mime_type,
            width,
            height,
            page_count: None,
            is_valid: true,
            validation_error: None,
        })
    }
}
