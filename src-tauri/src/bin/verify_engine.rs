use format_relay_lib::core::format::SupportedFormat;
use format_relay_lib::core::inspector::FileInspector;
use format_relay_lib::core::output_manager::{CollisionStrategy, OutputManager};
use format_relay_lib::engines::data_engine::NativeDataEngine;
use format_relay_lib::engines::image_engine::{ImageConversionOptions, NativeImageEngine};
use format_relay_lib::engines::pdf_engine::NativePdfEngine;
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
        let path = std::env::temp_dir().join(format!("fr_verify_{}_{}", std::process::id(), nanos));
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

fn main() {
    println!("============================================================");
    println!("FORMAT RELAY: Native Engine Verification Suite");
    println!("============================================================");

    // 1. Magic Bytes Inspection
    print!("[1/11] Testing magic byte signatures... ");
    let png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR";
    assert_eq!(SupportedFormat::from_magic_bytes(png_header), SupportedFormat::Png);
    let jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF";
    assert_eq!(SupportedFormat::from_magic_bytes(jpeg_header), SupportedFormat::Jpeg);
    let webp_header = b"RIFF\x24\x00\x00\x00WEBPVP8 ";
    assert_eq!(SupportedFormat::from_magic_bytes(webp_header), SupportedFormat::Webp);
    let bmp_header = b"BM\x36\x00\x00\x00\x00\x00";
    assert_eq!(SupportedFormat::from_magic_bytes(bmp_header), SupportedFormat::Bmp);
    let pdf_header = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n";
    assert_eq!(SupportedFormat::from_magic_bytes(pdf_header), SupportedFormat::Pdf);
    println!("PASSED");

    // 2. PNG to JPEG with transparency flattening
    print!("[2/11] Testing PNG to JPEG transcode with matte background... ");
    let dir = TestDir::new();
    let input_png = dir.path().join("source.png");
    let output_jpeg = dir.path().join("output.jpeg");
    let staging = dir.path().join("staging.part");

    let mut img = RgbaImage::new(64, 64);
    for x in 0..64 {
        for y in 0..64 {
            img.put_pixel(x, y, Rgba([x as u8 * 4, y as u8 * 4, 128, 200]));
        }
    }
    img.save_with_format(&input_png, ImageFormat::Png).expect("Failed to save input PNG");

    let meta = FileInspector::inspect(&input_png).expect("Inspection failed");
    assert_eq!(meta.detected_format, SupportedFormat::Png);
    assert_eq!(meta.width, Some(64));
    assert_eq!(meta.height, Some(64));

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
    engine.convert(&input_png, &staging, &options).expect("Conversion failed");

    let bytes = OutputManager::commit_staged_file(&staging, &output_jpeg, SupportedFormat::Jpeg)
        .expect("Failed to commit staged file");
    assert!(bytes > 0);
    assert!(output_jpeg.exists());
    assert!(!staging.exists());

    let decoded = image::open(&output_jpeg).expect("Failed to decode converted JPEG");
    assert_eq!(decoded.dimensions(), (64, 64));
    println!("PASSED ({} bytes written)", bytes);

    // 3. PNG to WebP with resize
    print!("[3/11] Testing PNG to WebP transcode with dimension resizing... ");
    let input_png2 = dir.path().join("source2.png");
    let output_webp = dir.path().join("output.webp");
    let staging2 = dir.path().join("staging2.part");

    let img2 = DynamicImage::new_rgb8(100, 100);
    img2.save_with_format(&input_png2, ImageFormat::Png).expect("Failed to save input PNG");

    let options2 = ImageConversionOptions {
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

    engine.convert(&input_png2, &staging2, &options2).expect("Conversion failed");
    let bytes2 = OutputManager::commit_staged_file(&staging2, &output_webp, SupportedFormat::Webp)
        .expect("Commit failed");
    let decoded2 = image::open(&output_webp).expect("Failed to decode converted WebP");
    assert_eq!(decoded2.dimensions(), (50, 50));
    println!("PASSED ({} bytes written, resized to 50x50)", bytes2);

    // 4. Output Collision Strategy Rename
    print!("[4/11] Testing output conflict resolution (rename strategy)... ");
    let source = dir.path().join("photo.png");
    File::create(&source).unwrap().write_all(b"test").unwrap();
    let target_existing = dir.path().join("photo.webp");
    File::create(&target_existing).unwrap().write_all(b"existing").unwrap();

    let resolved = OutputManager::resolve_output_path(
        &source,
        None,
        SupportedFormat::Webp,
        CollisionStrategy::Rename,
    )
    .expect("Resolution failed");
    assert_eq!(resolved, dir.path().join("photo_1.webp"));
    println!("PASSED (resolved to photo_1.webp)");

    // 5. Output Verification (Rejects 0-byte output)
    print!("[5/11] Testing deterministic output verification on empty/corrupted staging... ");
    let empty_staging = dir.path().join("empty.part");
    let target = dir.path().join("target.png");
    File::create(&empty_staging).unwrap();

    let result = OutputManager::commit_staged_file(
        &empty_staging,
        &target,
        SupportedFormat::Png,
    );
    assert!(result.is_err());
    assert!(!target.exists());
    assert!(!empty_staging.exists());
    println!("PASSED (empty output safely rejected and purged)");

    // 6. Native Images to PDF Generation
    print!("[6/11] Testing Images-to-PDF compilation... ");
    let img_a = dir.path().join("doc_page1.png");
    let img_b = dir.path().join("doc_page2.png");
    DynamicImage::new_rgb8(200, 300).save_with_format(&img_a, ImageFormat::Png).unwrap();
    DynamicImage::new_rgb8(400, 500).save_with_format(&img_b, ImageFormat::Png).unwrap();

    let pdf_staging = dir.path().join("staging_doc.part");
    let pdf_out = dir.path().join("combined_doc.pdf");

    let pages_created = NativePdfEngine::images_to_pdf(&[img_a, img_b], &pdf_staging)
        .expect("Failed to compile images to PDF");
    assert_eq!(pages_created, 2);

    let pdf_bytes = OutputManager::commit_staged_file(
        &pdf_staging,
        &pdf_out,
        SupportedFormat::Pdf,
    )
    .expect("Failed to commit staged PDF");
    assert!(pdf_bytes > 0);
    assert!(pdf_out.exists());

    let pdf_info = NativePdfEngine::get_info(&pdf_out).expect("Failed to inspect generated PDF");
    assert_eq!(pdf_info.page_count, 2);
    assert_eq!(pdf_info.pages[0].width as u32, 200);
    assert_eq!(pdf_info.pages[0].height as u32, 300);
    assert_eq!(pdf_info.pages[1].width as u32, 400);
    assert_eq!(pdf_info.pages[1].height as u32, 500);
    println!("PASSED (2 pages, dimensions verified: 200x300, 400x500)");

    // 7. Native PDF Page Rotation
    print!("[7/11] Testing PDF page rotation (+90 degrees)... ");
    let rotated_staging = dir.path().join("staging_rot.part");
    let rotated_out = dir.path().join("rotated.pdf");

    NativePdfEngine::rotate(&pdf_out, &rotated_staging, 90, Some(&[1]))
        .expect("Failed to rotate page 1");
    OutputManager::commit_staged_file(&rotated_staging, &rotated_out, SupportedFormat::Pdf)
        .expect("Failed to commit rotated PDF");

    let rot_info = NativePdfEngine::get_info(&rotated_out).expect("Failed to inspect rotated PDF");
    assert_eq!(rot_info.pages[0].rotation, 90);
    assert_eq!(rot_info.pages[1].rotation, 0);
    println!("PASSED (Page 1 rotated to 90 deg, Page 2 remains 0 deg)");

    // 8. Native PDF Page Extraction
    print!("[8/11] Testing PDF page extraction (extract page 2)... ");
    let extract_staging = dir.path().join("staging_ext.part");
    let extract_out = dir.path().join("extracted_page2.pdf");

    let extracted_count = NativePdfEngine::extract_pages(&pdf_out, &extract_staging, &[2])
        .expect("Failed to extract page 2");
    assert_eq!(extracted_count, 1);
    OutputManager::commit_staged_file(&extract_staging, &extract_out, SupportedFormat::Pdf)
        .expect("Failed to commit extracted PDF");

    let ext_info = NativePdfEngine::get_info(&extract_out).expect("Failed to inspect extracted PDF");
    assert_eq!(ext_info.page_count, 1);
    assert_eq!(ext_info.pages[0].width as u32, 400);
    println!("PASSED (Page 2 extracted into 1-page PDF)");

    // 9. Native PDF Document Merge
    print!("[9/11] Testing multi-document PDF merge (2 pages + 1 page)... ");
    let merge_staging = dir.path().join("staging_merge.part");
    let merge_out = dir.path().join("merged_3pages.pdf");

    let merged_count = NativePdfEngine::merge(&[pdf_out.clone(), extract_out.clone()], &merge_staging)
        .expect("Failed to merge PDFs");
    assert_eq!(merged_count, 3);
    OutputManager::commit_staged_file(&merge_staging, &merge_out, SupportedFormat::Pdf)
        .expect("Failed to commit merged PDF");

    let merge_info = NativePdfEngine::get_info(&merge_out).expect("Failed to inspect merged PDF");
    assert_eq!(merge_info.page_count, 3);
    println!("PASSED (Merged 3 pages successfully)");

    // 10. Native CSV to JSON Conversion
    print!("[10/11] Testing CSV to JSON transformation (RFC 4180 quotes & types)... ");
    let sample_csv = "id,name,city,active,score\n1,Alice,\"San Francisco, CA\",true,98.5\n2,Bob,\"New York, NY\",false,84.0\n";
    let csv_file = dir.path().join("test_data.csv");
    File::create(&csv_file).unwrap().write_all(sample_csv.as_bytes()).unwrap();

    let json_staging = dir.path().join("test_data.part");
    let json_out = dir.path().join("test_data.json");

    let rows_converted = NativeDataEngine::csv_to_json(&csv_file, &json_staging, ',', true)
        .expect("Failed to convert CSV to JSON");
    assert_eq!(rows_converted, 2);

    let json_bytes = OutputManager::commit_staged_file(&json_staging, &json_out, SupportedFormat::Json)
        .expect("Failed to commit staged JSON");
    assert!(json_bytes > 0);
    assert!(json_out.exists());

    let json_content = std::fs::read_to_string(&json_out).unwrap();
    let parsed_json: serde_json::Value = serde_json::from_str(&json_content).unwrap();
    assert!(parsed_json.is_array());
    let arr = parsed_json.as_array().unwrap();
    assert_eq!(arr.len(), 2);
    assert_eq!(arr[0]["name"], "Alice");
    assert_eq!(arr[0]["city"], "San Francisco, CA");
    assert_eq!(arr[0]["active"], true);
    assert_eq!(arr[0]["id"], 1);
    println!("PASSED (2 records, escaped commas & types verified)");

    // 11. Native JSON to CSV Round-Trip
    print!("[11/11] Testing JSON to CSV serialization round-trip... ");
    let csv_staging = dir.path().join("roundtrip.part");
    let csv_out = dir.path().join("roundtrip.csv");

    let rows_serialized = NativeDataEngine::json_to_csv(&json_out, &csv_staging, ',')
        .expect("Failed to convert JSON to CSV");
    assert_eq!(rows_serialized, 2);

    let csv_bytes = OutputManager::commit_staged_file(&csv_staging, &csv_out, SupportedFormat::Csv)
        .expect("Failed to commit staged CSV");
    assert!(csv_bytes > 0);
    assert!(csv_out.exists());

    let roundtrip_text = std::fs::read_to_string(&csv_out).unwrap();
    let roundtrip_lines: Vec<&str> = roundtrip_text.lines().collect();
    assert_eq!(roundtrip_lines.len(), 3); // 1 header + 2 rows
    assert!(roundtrip_lines[0].contains("id"));
    assert!(roundtrip_lines[0].contains("name"));
    assert!(roundtrip_lines[1].contains("\"San Francisco, CA\""));
    println!("PASSED (Round-trip CSV verified with quotes)");

    println!("============================================================");
    println!("ALL VERIFICATION CHECKS PASSED DETERMINISTICALLY");
    println!("============================================================");
}
