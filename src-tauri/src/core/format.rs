use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SupportedFormat {
    Png,
    Jpeg,
    Webp,
    Bmp,
    Ico,
    Pdf,
    Csv,
    Json,
    Unknown,
}

impl SupportedFormat {
    pub fn from_extension(ext: &str) -> Self {
        match ext.to_lowercase().as_str() {
            "png" => SupportedFormat::Png,
            "jpg" | "jpeg" => SupportedFormat::Jpeg,
            "webp" => SupportedFormat::Webp,
            "bmp" => SupportedFormat::Bmp,
            "ico" => SupportedFormat::Ico,
            "pdf" => SupportedFormat::Pdf,
            "csv" => SupportedFormat::Csv,
            "json" => SupportedFormat::Json,
            _ => SupportedFormat::Unknown,
        }
    }

    pub fn from_path(path: &Path) -> Self {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(Self::from_extension)
            .unwrap_or(SupportedFormat::Unknown)
    }

    pub fn from_magic_bytes(bytes: &[u8]) -> Self {
        if bytes.len() >= 8 && &bytes[0..8] == b"\x89PNG\r\n\x1a\n" {
            return SupportedFormat::Png;
        }
        if bytes.len() >= 3 && &bytes[0..3] == b"\xff\xd8\xff" {
            return SupportedFormat::Jpeg;
        }
        if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
            return SupportedFormat::Webp;
        }
        if bytes.len() >= 2 && &bytes[0..2] == b"BM" {
            return SupportedFormat::Bmp;
        }
        if bytes.len() >= 4 && &bytes[0..4] == b"\x00\x00\x01\x00" {
            return SupportedFormat::Ico;
        }
        if bytes.len() >= 4 && &bytes[0..4] == b"%PDF" {
            return SupportedFormat::Pdf;
        }
        SupportedFormat::Unknown
    }

    pub fn to_extension(&self) -> &'static str {
        match self {
            SupportedFormat::Png => "png",
            SupportedFormat::Jpeg => "jpeg",
            SupportedFormat::Webp => "webp",
            SupportedFormat::Bmp => "bmp",
            SupportedFormat::Ico => "ico",
            SupportedFormat::Pdf => "pdf",
            SupportedFormat::Csv => "csv",
            SupportedFormat::Json => "json",
            SupportedFormat::Unknown => "bin",
        }
    }

    pub fn mime_type(&self) -> &'static str {
        match self {
            SupportedFormat::Png => "image/png",
            SupportedFormat::Jpeg => "image/jpeg",
            SupportedFormat::Webp => "image/webp",
            SupportedFormat::Bmp => "image/bmp",
            SupportedFormat::Ico => "image/x-icon",
            SupportedFormat::Pdf => "application/pdf",
            SupportedFormat::Csv => "text/csv",
            SupportedFormat::Json => "application/json",
            SupportedFormat::Unknown => "application/octet-stream",
        }
    }

    pub fn is_image(&self) -> bool {
        matches!(
            self,
            SupportedFormat::Png
                | SupportedFormat::Jpeg
                | SupportedFormat::Webp
                | SupportedFormat::Bmp
                | SupportedFormat::Ico
        )
    }
}
