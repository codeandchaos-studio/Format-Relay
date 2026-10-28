# FORMAT RELAY: Product Requirements Summary

## 1. Overview
Format Relay is a cross-platform desktop file conversion and processing utility engineered by Code & Chaos. The application is built for local-first execution, complete privacy, zero mandatory network access, and deterministic output verification.

## 2. Core Functional Requirements
- File Ingestion:
  - Drag-and-drop file targets with visual feedback.
  - Native file picker supporting multi-file selection.
  - File queue with batch tracking, type identification, and size inspection.
- File Inspection:
  - Magic byte file signature detection to prevent reliance on file extensions alone.
  - Safe extraction of metadata (dimensions, mime type, size, page count).
  - Validation before allowing queue ingestion.
- Capability Matching:
  - Automatic identification of supported operations for single and batch selections.
  - Strict filtering: operations are never presented unless the required engine is verified.
- Conversion Engines:
  - Native Rust imaging engine (PNG, JPEG, WebP, BMP, ICO).
  - PDF manipulation engine (merge, split, page range extraction, rotation).
  - Structured data conversion (JSON to CSV, CSV to JSON).
  - Controlled external adapters (FFmpeg, LibreOffice) as optional, hash-verified dependencies in future milestones.
- Job and Queue Management:
  - Thread-pool orchestration with bounded concurrency.
  - State machine for jobs: Pending, Running, Completed, Failed, Cancelled.
  - Progress reporting and cancellation mechanisms per item.
  - Real-time job logs stored strictly in memory and local session storage.
- Output Safety:
  - Staging conversions to isolated temporary working paths.
  - Atomic rename and move to final output destination upon verification.
  - Never overwrite existing files silently; automated conflict resolution (indexed suffixing).
  - Explicit output verification (size check, decoding check) before marking success.
- Persistence and State:
  - SQLite database for persistent historical records and user presets.
  - Local configuration file for user preferences (output path, theme, concurrency).
  - Zero cloud dependencies, zero analytics, zero external network queries during processing.

## 3. Non-Functional Requirements
- Performance: Instantaneous interface response under heavy file queues; asynchronous non-blocking background workers.
- Security: Sandboxed frontend shell with strict Tauri IPC isolation; no arbitrary shell execution.
- Maintainability: Modular Rust crates/modules separating engine adapters, job queues, inspection services, and IPC handlers.
- Portability: Windows, macOS, and Linux support using native system dialogs and file APIs.
