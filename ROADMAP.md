# FORMAT RELAY: Phased Implementation Checklist

## Milestone 1: Application Skeleton and Design System (Completed)
- [x] Development environment verification (Rust toolchain, Node.js, Tauri CLI).
- [x] Initial architecture, requirements, and risk documentation.
- [x] Tauri 2 application foundation with React 19 and TypeScript.
- [x] Design system establishment:
  - Format Relay independent dark/light color palette (Deep Carbon, Graphite, Slate, Tech Cyan, Warm Amber).
  - Clean tactile layout without generic gradients or emojis.
  - Responsive conversion workspace and navigation frame.
- [x] Native OS file drag-and-drop listener and native file picker integration.
- [x] File queue state management with batch intake.
- [x] Safe file inspection service (magic bytes, MIME type, dimensions, file size).
- [x] Operation selector displaying compatible actions for active queue items.
- [x] Settings persistence for default output paths, collision rules, and UI preferences.

## Milestone 2: Native Image Conversion Engine (Completed)
- [x] Integration of pure Rust image processing engine (`image` crate).
- [x] Supported formats: PNG, JPEG, WebP, BMP, ICO.
- [x] Image conversion features:
  - Format conversion with quality tuning (1-100%).
  - Dimensional resizing (maintain aspect ratio, exact dimensions, Lanczos3 filter).
  - Transparency preservation and matte color fallback for non-alpha formats.
  - Conversion to multi-page or single-page PDF.
- [x] Multi-threaded job queue with bounded concurrency and progress reporting.
- [x] Output manager with staging in temporary files, atomic commit, and collision management (Rename / Overwrite / Skip).
- [x] Real-time verification of generated output files (decodability and integrity via `image::load`).

## Milestone 3: PDF Processing Engine (Completed)
- [x] Native Rust PDF engine integration via `lopdf`.
- [x] Operations:
  - PDF Merge: Combine multiple documents in queue order with unified catalog/page tree.
  - PDF Split: Split into individual single-page documents.
  - Page Extraction: Extract specific page ranges (e.g. 1-3, 5).
  - Page Rotation: 90, 180, 270 degree adjustments preserving page dictionaries.
  - Images to PDF: Multi-page compilation with FlateDecode streams and page scaling.
- [x] Output validation and page structure verification via `lopdf::Document::load`.

## Milestone 4: Structured Data Conversion (Completed)
- [x] Pure Rust RFC 4180 CSV parser and serializer with zero external runtime dependencies.
- [x] CSV to JSON converter with typed inference (numbers, booleans, nulls) and pretty-printing.
- [x] JSON to CSV converter handling array of objects and multi-delimiter support (`,`, `\t`, `;`, `|`).
- [x] Output syntax verification (`serde_json::from_reader`) ensuring zero corrupt data writes.

## Milestone 5: Local Persistence and History (Completed)
- [x] Local-first persistent storage for conversion history and user configuration.
- [x] History management screen with real-time search, file explorer reveal, and entry deletion.
- [x] Clear history and storage safeguards (zero remote telemetry, zero cloud tracking).

## Milestone 6: Managed External Engines (Media & Documents - Planned)
- [ ] External engine discovery and manager interface.
- [ ] FFmpeg adapter with hash verification for audio/video extraction and conversion.
- [ ] Document conversion bridge for LibreOffice headless operations.
