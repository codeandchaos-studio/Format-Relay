# FORMAT RELAY: Phased Implementation Checklist

## Milestone 1: Application Skeleton and Design System (Completed)
- [x] Development environment verification (Rust toolchain, Node.js, Tauri CLI).
- [x] Initial architecture, requirements, and risk documentation.
- [x] Tauri 2 application foundation with React 19 and TypeScript.
- [x] Design system establishment:
  - Format Relay dark palette and clean tactile layout.
  - Responsive conversion workspace and navigation frame.
- [x] Native OS file drag-and-drop listener and native file picker integration.
- [x] File queue state management with batch intake.
- [x] Safe file inspection service (magic bytes, MIME type, dimensions, file size).
- [x] Settings persistence for default output paths, collision rules, and UI preferences.

## Milestone 2: Format Wheel Gesture Engine & Try-It Stage (Completed)
- [x] Format Wheel bloom around cursor on file drag (Shift / Ctrl + drag or click-drag).
- [x] Adaptive format slices per file type (Video: MP4, MP4 720p, WEBM, MOV, GIF, MP3, MKV, AVI; Image: PNG, JPG, JPG 70%, WEBP, PDF, TIFF, BMP, ICO; Document: PDF, HWPX, EPUB, TXT, HTML, DOCX).
- [x] Interactive Center disk (`1 MOV`, `1 HEIC`, `Release in the middle to cancel`).
- [x] Smooth circular progress ring animation counting 0% -> 100% on drop.
- [x] 3D flip card transition to Back Face via `Tab` or mouse wheel.
- [x] Back face tools: Crop, Rotate, Flip, Grayscale, Remove background, Pack ZIP (PDF merge and split retired per spec).
- [x] Aspect Dial for Crop with shortcut `A` (1:1, 4:3, 3:2, 16:9, original) with Crop & Save / Crop & Next.
- [x] Interactive "Try it here" Stage with sample cards (`trip.heic`, `clip.mov`, `report.docx`), custom file intake, and "CONVERTED FILES" shelf.

## Milestone 3: Native Image Conversion Engine (Completed)
- [x] Pure Rust image processing engine (`image` crate).
- [x] Supported formats: PNG, JPEG, WebP, BMP, ICO, Images-to-PDF.
- [x] Image conversion features:
  - Format conversion with quality tuning (1-100%).
  - Dimensional resizing and alpha preservation.
- [x] Output manager with temporary staging, atomic commit, and collision management.
- [x] Real-time verification of generated output files.

## Milestone 4: Structured Data Conversion (Completed)
- [x] Pure Rust RFC 4180 CSV parser and serializer with zero external runtime dependencies.
- [x] CSV to JSON converter with typed inference and pretty-printing.
- [x] JSON to CSV converter handling array of objects and multi-delimiter support.
- [x] Output syntax verification (`serde_json::from_reader`).

## Milestone 5: Local Persistence and History (Completed)
- [x] Local-first persistent storage for conversion history and user configuration.
- [x] History management screen with search, file explorer reveal, and entry deletion.
- [x] Zero remote telemetry, 100% offline local processing.
