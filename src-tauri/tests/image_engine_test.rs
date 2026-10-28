use format_relay_lib::core::format::SupportedFormat;
use format_relay_lib::core::inspector::FileInspector;
use format_relay_lib::core::output_manager::{CollisionStrategy, OutputManager};
use format_relay_lib::engines::image_engine::{ImageConversionOptions, NativeImageEngine};
use image::{DynamicImage, GenericImageView, ImageFormat, Rgba, RgbaImage};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

struct TestDir(PathBuf);

impl TestDir {
    fn new() -> Self {
        let nanos = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.subsec_nanos())
            .unwrap_or(12345);
        let path = std::env::temp_dir().join(format!("fr_test_{}_{}", std::process::id(), nanos));
        std::fs::create_dir_all(&path).expect("Failed to create test directory");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TestDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

#[test]
fn test_magic_bytes_detection() {
    let png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR";
    assert_eq!(
        SupportedFormat::from_magic_bytes(png_header),
        SupportedFormat::Png
    );

    let jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF";
    assert_eq!(
        SupportedFormat::from_magic_bytes(jpeg_header),
        SupportedFormat::Jpeg
    );

    let webp_header = b"RIFF\x24\x00\x00\x00WEBPVP8 ";
    assert_eq!(
        SupportedFormat::from_magic_bytes(webp_header),
        SupportedFormat::Webp
    );

    let bmp_header = b"BM\x36\x00\x00\x00\x00\x00";
    assert_eq!(
        SupportedFormat::from_magic_bytes(bmp_header),
        SupportedFormat::Bmp
    );

    let pdf_header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n";
    assert_eq!(
        SupportedFormat::from_magic_bytes(pdf_header),
        SupportedFormat::Pdf
    );
}

#[test]
fn test_image_conversion_png_to_jpeg() {
    let dir = TestDir::new();
    let input_png = dir.path().join("source.png");
    let output_jpeg = dir.path().join("output.jpeg");
    let staging = dir.path().join("staging.part");

    // Generate test 64x64 RGBA PNG with semi-transparency
    let mut img = RgbaImage::new(64, 64);
    for x in 0..64 {
        for y in 0..64 {
            img.put_pixel(x, y, Rgba([x as u8 * 4, y as u8 * 4, 128, 200]));
        }
    }
    img.save_with_format(&input_png, ImageFormat::Png)
        .expect("Failed to save input PNG");

    // Inspect file
    let meta = FileInspector::inspect(&input_png).expect("Inspection failed");
    assert_eq!(meta.detected_format, SupportedFormat::Png);
    assert_eq!(meta.width, Some(64));
    assert_eq!(meta.height, Some(64));

    // Convert PNG to JPEG
    let options = ImageConversionOptions {
        target_format: SupportedFormat::Jpeg,
        quality: 90,
        resize_enabled: false,
        resize_mode: None,
        width: None,
        height: None,
        percent: None,
        preserve_aspect_ratio: true,
        matte_color: Some("#FFFFFF".to_string()),
    };

    let engine = NativeImageEngine::new();
    engine
        .convert(&input_png, &staging, &options)
        .expect("Conversion failed");

    // Commit staged output
    let bytes = OutputManager::commit_staged_file(&staging, &output_jpeg, SupportedFormat::Jpeg)
        .expect("Failed to commit staged file");
    assert!(bytes > 0);
    assert!(output_jpeg.exists());
    assert!(!staging.exists());

    // Deterministic verification: reopen and decode output
    let decoded = image::open(&output_jpeg).expect("Failed to decode converted JPEG");
    assert_eq!(decoded.dimensions(), (64, 64));
}

#[test]
fn test_image_conversion_png_to_webp_and_resize() {
    let dir = TestDir::new();
    let input_png = dir.path().join("source.png");
    let output_webp = dir.path().join("output.webp");
    let staging = dir.path().join("staging.part");

    let img = DynamicImage::new_rgb8(100, 100);
    img.save_with_format(&input_png, ImageFormat::Png)
        .expect("Failed to save input PNG");

    let options = ImageConversionOptions {
        target_format: SupportedFormat::Webp,
        quality: 80,
        resize_enabled: true,
        resize_mode: Some("fit".to_string()),
        width: Some(50),
        height: Some(50),
        percent: None,
        preserve_aspect_ratio: true,
        matte_color: None,
    };

    let engine = NativeImageEngine::new();
    engine
        .convert(&input_png, &staging, &options)
        .expect("Conversion failed");

    OutputManager::commit_staged_file(&staging, &output_webp, SupportedFormat::Webp)
        .expect("Commit failed");

    let decoded = image::open(&output_webp).expect("Failed to decode converted WebP");
    assert_eq!(decoded.dimensions(), (50, 50));
}

#[test]
fn test_collision_strategy_rename() {
    let dir = TestDir::new();
    let source = dir.path().join("photo.png");
    File::create(&source).unwrap().write_all(b"test").unwrap();

    let target_existing = dir.path().join("photo.webp");
    File::create(&target_existing)
        .unwrap()
        .write_all(b"existing")
        .unwrap();

    let resolved = OutputManager::resolve_output_path(
        &source,
        None,
        SupportedFormat::Webp,
        CollisionStrategy::Rename,
    )
    .expect("Resolution failed");

    assert_eq!(resolved, dir.path().join("photo_1.webp"));
}

#[test]
fn test_output_verification_rejects_empty_file() {
    let dir = TestDir::new();
    let empty_staging = dir.path().join("empty.part");
    let target = dir.path().join("target.png");

    File::create(&empty_staging).unwrap(); // 0 bytes

    let result = OutputManager::commit_staged_file(
        &empty_staging,
        &target,
        SupportedFormat::Png,
    );

    assert!(result.is_err());
    assert!(!target.exists());
    assert!(!empty_staging.exists()); // Verifies temporary file is automatically cleaned up
}
