use crate::core::error::RelayError;
use crate::core::format::SupportedFormat;
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageFormat, Rgb};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionOptions {
    pub target_format: SupportedFormat,
    pub quality: u8, // 1 - 100
    pub resize_enabled: bool,
    pub resize_mode: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub percent: Option<u32>,
    pub preserve_aspect_ratio: bool,
    pub matte_color: Option<String>,
}

pub struct NativeImageEngine;

impl NativeImageEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn convert(
        &self,
        input_path: &Path,
        staging_path: &Path,
        options: &ImageConversionOptions,
    ) -> Result<(), RelayError> {
        let mut img = image::open(input_path).map_err(RelayError::ImageEngine)?;

        // Apply resizing if enabled
        if options.resize_enabled {
            img = Self::apply_resize(img, options);
        }

        // Handle target format encoding
        match options.target_format {
            SupportedFormat::Jpeg => {
                let quality = options.quality.clamp(1, 100);
                let rgb_img = Self::flatten_transparency_to_rgb(img, options.matte_color.as_deref());
                let file = File::create(staging_path).map_err(RelayError::Io)?;
                let mut writer = BufWriter::new(file);
                let mut encoder = JpegEncoder::new_with_quality(&mut writer, quality);
                encoder
                    .encode(
                        rgb_img.as_raw(),
                        rgb_img.width(),
                        rgb_img.height(),
                        image::ExtendedColorType::Rgb8,
                    )
                    .map_err(RelayError::ImageEngine)?;
            }
            SupportedFormat::Png => {
                img.save_with_format(staging_path, ImageFormat::Png)
                    .map_err(RelayError::ImageEngine)?;
            }
            SupportedFormat::Webp => {
                img.save_with_format(staging_path, ImageFormat::WebP)
                    .map_err(RelayError::ImageEngine)?;
            }
            SupportedFormat::Bmp => {
                let rgb_img = Self::flatten_transparency_to_rgb(img, options.matte_color.as_deref());
                let dyn_rgb = DynamicImage::ImageRgb8(rgb_img);
                dyn_rgb
                    .save_with_format(staging_path, ImageFormat::Bmp)
                    .map_err(RelayError::ImageEngine)?;
            }
            SupportedFormat::Ico => {
                // Resize to max 256x256 for ICO standards
                let (w, h) = img.dimensions();
                let ico_img = if w > 256 || h > 256 {
                    img.resize(256, 256, FilterType::Lanczos3)
                } else {
                    img
                };
                ico_img
                    .save_with_format(staging_path, ImageFormat::Ico)
                    .map_err(RelayError::ImageEngine)?;
            }
            _ => {
                return Err(RelayError::UnsupportedFormat(format!(
                    "Unsupported image target format: {:?}",
                    options.target_format
                )));
            }
        }

        Ok(())
    }

    fn apply_resize(img: DynamicImage, options: &ImageConversionOptions) -> DynamicImage {
        let (orig_w, orig_h) = img.dimensions();

        let (target_w, target_h) = match (options.width, options.height, options.percent) {
            (Some(w), Some(h), _) => (w.max(1), h.max(1)),
            (Some(w), None, _) => {
                let ratio = w as f64 / orig_w as f64;
                (w.max(1), ((orig_h as f64) * ratio).round().max(1.0) as u32)
            }
            (None, Some(h), _) => {
                let ratio = h as f64 / orig_h as f64;
                (((orig_w as f64) * ratio).round().max(1.0) as u32, h.max(1))
            }
            (None, None, Some(pct)) => {
                let factor = (pct as f64) / 100.0;
                (
                    ((orig_w as f64) * factor).round().max(1.0) as u32,
                    ((orig_h as f64) * factor).round().max(1.0) as u32,
                )
            }
            _ => (orig_w, orig_h),
        };

        if options.preserve_aspect_ratio {
            img.resize(target_w, target_h, FilterType::Lanczos3)
        } else {
            img.resize_exact(target_w, target_h, FilterType::Lanczos3)
        }
    }

    /// Flattens RGBA image over a solid matte color (defaults to white).
    fn flatten_transparency_to_rgb(
        img: DynamicImage,
        matte_hex: Option<&str>,
    ) -> image::RgbImage {
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        let matte = parse_hex_color(matte_hex.unwrap_or("#FFFFFF"));

        let mut rgb_img = image::RgbImage::new(width, height);

        for (x, y, pixel) in rgba.enumerate_pixels() {
            let alpha = pixel[3] as f32 / 255.0;
            let inv_alpha = 1.0 - alpha;

            let r = ((pixel[0] as f32 * alpha) + (matte[0] as f32 * inv_alpha)).round() as u8;
            let g = ((pixel[1] as f32 * alpha) + (matte[1] as f32 * inv_alpha)).round() as u8;
            let b = ((pixel[2] as f32 * alpha) + (matte[2] as f32 * inv_alpha)).round() as u8;

            rgb_img.put_pixel(x, y, Rgb([r, g, b]));
        }

        rgb_img
    }
}

fn parse_hex_color(hex: &str) -> [u8; 3] {
    let cleaned = hex.trim_start_matches('#');
    if cleaned.len() == 6 {
        let r = u8::from_str_radix(&cleaned[0..2], 16).unwrap_or(255);
        let g = u8::from_str_radix(&cleaned[2..4], 16).unwrap_or(255);
        let b = u8::from_str_radix(&cleaned[4..6], 16).unwrap_or(255);
        [r, g, b]
    } else {
        [255, 255, 255]
    }
}
