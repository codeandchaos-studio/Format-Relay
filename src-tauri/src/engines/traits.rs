use crate::core::error::RelayError;
use crate::core::format::SupportedFormat;
use std::path::Path;

pub trait ConversionEngine {
    fn name(&self) -> &'static str;
    fn can_handle(&self, from: SupportedFormat, to: SupportedFormat) -> bool;
    fn convert(
        &self,
        input_path: &Path,
        output_path: &Path,
        from_format: SupportedFormat,
        to_format: SupportedFormat,
    ) -> Result<(), RelayError>;
}
