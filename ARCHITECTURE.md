# FORMAT RELAY: System Architecture

## 1. Architectural Philosophy
Format Relay adheres to a decoupled, local-first desktop architecture. The frontend acts purely as a presentation layer and command dispatcher, while the Rust core handles all file I/O, format inspection, conversion execution, and state persistence.

```
+-------------------------------------------------------------------+
|                         User Interface                            |
|             React 19 + TypeScript + Tailwind CSS / Vite           |
+---------------------------------+---------------------------------+
                                  |
                           Tauri 2 IPC Bus
                                  |
+---------------------------------v---------------------------------+
|                        Rust Core Runtime                          |
|                                                                   |
|  +---------------------+  +-----------------+  +---------------+  |
|  | File Inspector      |  | Capability       |  | Job Manager   |  |
|  | (Magic Bytes / Meta)|  | Registry        |  | (Queue/Pool)  |  |
|  +---------------------+  +-----------------+  +---------------+  |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |                   Engine Adapter Layer                      |  |
|  |   +---------------+  +---------------+  +---------------+   |  |
|  |   | Image Adapter |  | PDF Adapter   |  | Data Adapter  |   |  |
|  |   +---------------+  +---------------+  +---------------+   |  |
|  +-------------------------------------------------------------+  |
|                                                                   |
|  +---------------------+  +-----------------+  +---------------+  |
|  | Output Manager      |  | SQLite Storage  |  | Settings Svc  |  |
|  | (Atomic Stage/Move) |  | (History/Preset)|  | (Local JSON)  |  |
|  +---------------------+  +-----------------+  +---------------+  |
+-------------------------------------------------------------------+
```

## 2. Component Specifications

### 2.1 Tauri 2 Desktop Shell
- Responsible for native window creation, OS menu hooks, drag-and-drop ingestion, and IPC command mapping.
- Restrictive permission boundary: file system access is strictly arbitrated through Rust commands; no arbitrary shell execution permitted.

### 2.2 File Inspection Service
- Inspects magic bytes (file signatures) to classify file types reliably regardless of extensions.
- Extracts dimensions, color spaces, page counts, and structural headers without decoding entire files into memory.
- Safely validates that files are accessible and not locked or corrupted.

### 2.3 Capability Registry
- Central catalog describing supported conversion pairs: source format, target format, required engine, configurable parameters, and validation constraints.
- Prevents the interface from exposing unsupported or impossible conversion paths.

### 2.4 Job Manager & Queue Orchestrator
- Multi-threaded bounded queue using crossbeam or tokio tasks.
- Manages job lifecycle: Pending -> Running -> Completed / Failed / Cancelled.
- Communicates granular progress (0 to 100%) and stage notifications back to the frontend through Tauri events.

### 2.5 Engine Adapter Layer
- Uniform trait `ConversionEngine`:
  - `name(&self) -> &'static str`
  - `can_handle(&self, from: &Format, to: &Format) -> bool`
  - `convert(&self, task: &ConversionTask, progress_tx: Sender<f32>) -> Result<OutputSummary, EngineError>`
- Adapters isolate dependencies. The core image engine uses pure Rust crates (`image`, `webp`, `zune-jpeg`), while PDF operations use `lopdf` or `pdf-writer`.

### 2.6 Output Manager
- Manages isolated staging directories inside the operating system temporary folder.
- Executes conversions to `.part` temporary files.
- Validates the resulting output file before committing.
- Handles filename collision strategies: `Overwrite` (explicit user confirmation only), `Skip`, or `Rename` (e.g., `document_1.pdf`).
- Commits completed outputs atomically.

### 2.7 Local Persistence Layer
- SQLite database stored in standard OS app data directory (`%APPDATA%/FormatRelay` on Windows, `~/Library/Application Support/FormatRelay` on macOS, `~/.config/FormatRelay` on Linux).
- Stores non-sensitive operation history (timestamp, source format, target format, duration, status, file size delta).
- Local JSON configuration for interface preferences, window state, and queue settings.
