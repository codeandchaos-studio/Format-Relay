# FORMAT RELAY: Testing Strategy

## 1. Testing Philosophy
Format Relay requires rigorous, automated verification across both the Rust backend and React frontend. Conversions must be verified through actual binary inspection, decoded structure validation, and byte-level checks. A conversion is never marked successful merely because an execution returned code 0.

## 2. Test Tiers

### 2.1 Backend Unit and Integration Tests (Rust)
- File Inspection Tests:
  - Verify detection of PNG, JPEG, WebP, PDF, CSV, JSON across valid, truncated, and intentionally corrupted files.
  - Test header sniffing to prevent extension spoofing.
- Image Engine Tests:
  - Test PNG to JPEG conversion with quality parameters (verify JPEG headers, color reproduction).
  - Test PNG with alpha to JPEG (verify alpha flattening with configurable background matte).
  - Test resize operations (verify output dimensions and aspect ratio preservation).
  - Test WebP lossless and lossy encoding.
  - Test output verification: verify generated files can be re-opened and decoded cleanly.
- PDF Engine Tests:
  - Test merging two valid PDFs into one (verify total page count equals sum of parts).
  - Test page rotation (verify page dictionary /Rotate tags).
  - Test page extraction across ranges (e.g., "1-3, 5").
- Output Manager Tests:
  - Test temporary file creation and atomic promotion.
  - Test collision naming schemes (e.g., `sample_1.png` when `sample.png` exists).
  - Test cleanup on simulated conversion failure (ensure zero orphan temporary files).
- SQLite Persistence Tests:
  - Test migration scripts, schema versioning, and CRUD operations for history and presets.

### 2.2 Frontend Component and Store Tests (TypeScript)
- Queue Store:
  - Verify file addition, batch deduplication, removal, and status updates.
- Capability Matching:
  - Test that selecting a PNG file enables PNG-to-JPEG, PNG-to-WebP, and Resize, but disables PDF-Merge.
- Settings Form Validation:
  - Validate quality sliders (1-100), dimension inputs, and custom output path formats.

### 2.3 End-to-End Verification Fixtures
Small, deterministic sample files are maintained in `tests/fixtures/`:
- `sample.png`: 32x32 RGBA test image with transparency.
- `sample.jpg`: 32x32 RGB test photograph.
- `sample.webp`: 32x32 test graphic.
- `sample_document.pdf`: 2-page test document.
- `sample_data.csv`: Delimited records with commas, quotes, and newline characters.
- `sample_data.json`: Valid structured records matching the CSV fixture.
- `corrupt_sample.png`: Intentionally truncated binary file to verify graceful failure handling.
