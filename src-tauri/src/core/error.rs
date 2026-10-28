use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RelayError {
    #[error("File system I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid or unsupported file format: {0}")]
    UnsupportedFormat(String),

    #[error("File inspection error: {0}")]
    InspectionFailed(String),

    #[error("Image processing error: {0}")]
    ImageEngine(#[from] image::ImageError),

    #[error("PDF processing error: {0}")]
    PdfEngine(String),

    #[error("Conversion failed: {0}")]
    ConversionFailed(String),

    #[error("Output generation error: {0}")]
    OutputError(String),

    #[error("File verification failed: {0}")]
    VerificationFailed(String),

    #[error("Operation was cancelled")]
    Cancelled,
}

impl Serialize for RelayError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
