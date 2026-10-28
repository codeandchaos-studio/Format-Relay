# FORMAT RELAY: Dependency and Engine Plan

## 1. Engine Strategy
To guarantee offline reliability and high performance, Format Relay uses a tiered engine architecture:
1. Tier 1: Built-in Native Rust Engines (Zero external dependencies; bundled directly in the application binary).
2. Tier 2: Managed Optional External Engines (FFmpeg, LibreOffice) downloaded on demand with strict SHA-256 integrity verification.

## 2. Core Dependencies

### 2.1 Rust Core (Backend)
- `tauri` (v2.x): Application shell, IPC bridge, native windowing.
- `tauri-plugin-dialog`: Native OS file and directory picker integration.
- `tauri-plugin-fs`: Sandboxed local file operations.
- `serde`, `serde_json`: High-performance serialization and schema validation.
- `tokio`: Asynchronous runtime for concurrent job scheduling.
- `image` (v0.25): Pure Rust image decoding, manipulation, and encoding (PNG, JPEG, WebP, BMP, GIF, ICO, TIFF).
- `imageproc`: Geometric transformations, sharpening, and contrast adjustment.
- `lopdf` / `pdf-writer`: PDF document parsing, page extraction, rotation, and merging.
- `csv`, `serde_json`: Delimited structured data parsing and generation.
- `rusqlite`: Embedded local SQLite persistence for task history and user presets.
- `sha2`: Cryptographic checksum calculation for file verification.
- `tempfile`: Secure temporary directory allocation and automatic cleanup.

### 2.2 Frontend (User Interface)
- `react` (v19.x), `react-dom`: Component tree and UI lifecycle.
- `typescript` (v5.x): Static typing and strict interfaces matching Rust models.
- `vite` (v6.x): Rapid frontend bundling and development server.
- `tailwindcss` (v4.x) / `@tailwindcss/vite`: Utility styling conforming to the Format Relay independent palette.
- `lucide-react`: Crisp geometric icons (no decorative emojis).
- `zustand`: Lightweight local client state management for queue, inspection states, and active settings.

### 2.3 Managed External Engines (Phased)
- FFmpeg (Phase 2):
  - Used for audio/video transcoding, stream extraction, and media inspection.
  - Pin versions to stable FFmpeg 7.x builds.
  - Verification: Enforce SHA-256 hash validation before execution.
  - Isolation: Run as a sandboxed subprocess with strict stdin/stdout pipes and resource timeouts.
- LibreOffice headless (Phase 2):
  - Used for document conversion (DOCX, PPTX, XLSX to PDF/TXT).
  - Explicit user authorization before invoking.

## 3. License and Notice Compliance
All bundled dependencies must possess permissive open-source licenses (MIT, Apache-2.0, BSD-3-Clause, MPL-2.0). GPL components (such as FFmpeg GPL builds) are decoupled and managed as external optional binaries to preserve licensing boundaries. Complete attribution is maintained in `THIRD-PARTY-NOTICES.md`.
