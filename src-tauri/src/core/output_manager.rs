use super::error::RelayError;
use super::format::SupportedFormat;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CollisionStrategy {
    Rename,
    Overwrite,
    Skip,
}

pub struct OutputManager;

impl OutputManager {
    /// Determines the final output path based on source path, optional output directory,
    /// target format, and collision resolution strategy.
    pub fn resolve_output_path(
        source_path: &Path,
        custom_output_dir: Option<&Path>,
        target_format: SupportedFormat,
        collision_strategy: CollisionStrategy,
    ) -> Result<PathBuf, RelayError> {
        let parent_dir = match custom_output_dir {
            Some(dir) if dir.exists() => dir.to_path_buf(),
            _ => source_path
                .parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| PathBuf::from(".")),
        };

        let file_stem = source_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("output");

        let target_ext = target_format.to_extension();
        let mut candidate = parent_dir.join(format!("{}.{}", file_stem, target_ext));

        if candidate.exists() {
            match collision_strategy {
                CollisionStrategy::Overwrite => Ok(candidate),
                CollisionStrategy::Skip => Err(RelayError::OutputError(format!(
                    "Target file already exists and collision strategy is set to Skip: {}",
                    candidate.display()
                ))),
                CollisionStrategy::Rename => {
                    let mut index = 1;
                    while candidate.exists() {
                        candidate = parent_dir.join(format!("{}_{}.{}", file_stem, index, target_ext));
                        index += 1;
                    }
                    Ok(candidate)
                }
            }
        } else {
            Ok(candidate)
        }
    }

    /// Allocates an isolated temporary staging path adjacent to the destination or in temp.
    pub fn create_staging_path(target_path: &Path) -> PathBuf {
        let parent = target_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(std::env::temp_dir);

        let random_suffix: u32 = rand_u32();
        parent.join(format!(
            ".tmp_{}_{}.part",
            target_path.file_name().and_then(|n| n.to_str()).unwrap_or("file"),
            random_suffix
        ))
    }

    /// Atomically moves the temporary staged file to the final destination,
    /// dropping the temporary file if verification fails.
    pub fn commit_staged_file(
        staging_path: &Path,
        target_path: &Path,
        target_format: SupportedFormat,
    ) -> Result<u64, RelayError> {
        if !staging_path.exists() {
            return Err(RelayError::OutputError(
                "Staging file was not produced by conversion engine".to_string(),
            ));
        }

        let metadata = std::fs::metadata(staging_path).map_err(RelayError::Io)?;
        let size_bytes = metadata.len();

        if size_bytes == 0 {
            let _ = std::fs::remove_file(staging_path);
            return Err(RelayError::VerificationFailed(
                "Produced output file is empty (0 bytes)".to_string(),
            ));
        }

        // Perform format-specific verification if it is an image
        if target_format.is_image() {
            let img_format = match target_format {
                SupportedFormat::Png => image::ImageFormat::Png,
                SupportedFormat::Jpeg => image::ImageFormat::Jpeg,
                SupportedFormat::Webp => image::ImageFormat::WebP,
                SupportedFormat::Bmp => image::ImageFormat::Bmp,
                SupportedFormat::Ico => image::ImageFormat::Ico,
                _ => image::ImageFormat::Png,
            };

            let file = std::fs::File::open(staging_path).map_err(RelayError::Io)?;
            let reader = std::io::BufReader::new(file);
            if let Err(e) = image::load(reader, img_format) {
                let _ = std::fs::remove_file(staging_path);
                return Err(RelayError::VerificationFailed(format!(
                    "Output image failed decodability verification: {}",
                    e
                )));
            }
        } else if target_format == SupportedFormat::Pdf {
            if let Err(e) = lopdf::Document::load(staging_path) {
                let _ = std::fs::remove_file(staging_path);
                return Err(RelayError::VerificationFailed(format!(
                    "Output PDF failed structural verification: {}",
                    e
                )));
            }
        } else if target_format == SupportedFormat::Json {
            let file = std::fs::File::open(staging_path).map_err(RelayError::Io)?;
            let reader = std::io::BufReader::new(file);
            let val: Result<serde_json::Value, _> = serde_json::from_reader(reader);
            if let Err(e) = val {
                let _ = std::fs::remove_file(staging_path);
                return Err(RelayError::VerificationFailed(format!(
                    "Output JSON failed syntax verification: {}",
                    e
                )));
            }
        }

        // Atomic promote / rename
        if let Err(e) = std::fs::rename(staging_path, target_path) {
            // Fallback for cross-device move if rename fails
            std::fs::copy(staging_path, target_path).map_err(RelayError::Io)?;
            let _ = std::fs::remove_file(staging_path);
            let _ = e;
        }

        Ok(size_bytes)
    }
}

/// Simple pseudorandom number generator for staging file suffixes without external rand dependency
fn rand_u32() -> u32 {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(42);
    nanos ^ 0x9E3779B9
}
