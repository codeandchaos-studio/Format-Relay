# FORMAT RELAY: Platform-Specific Risks and Mitigations

## 1. Windows Risks
- File Locking:
  - Risk: Windows places exclusive locks on open files, causing temporary staging renames to fail if a handle is held open by an inspection service, antivirus, or thumbnail generator.
  - Mitigation: Ensure all file handles in Rust are explicitly closed before initiating atomic renames or promotions. Implement exponential backoff retry for atomic moves.
- Long Path Limits:
  - Risk: Paths exceeding 260 characters cause `MAX_PATH` errors on legacy Windows configurations.
  - Mitigation: Use canonicalized extended-length prefixes (`\\?\`) for all internal file operations in the Rust backend.
- High-DPI Scaling:
  - Risk: Blurred typography or misaligned drag-and-drop hitboxes on high-density Windows displays.
  - Mitigation: Rely on Tauri 2 native per-monitor DPI awareness and CSS logical pixel sizing.

## 2. macOS Risks
- App Sandboxing and Quarantine:
  - Risk: Gatekeeper and quarantine flags (`com.apple.quarantine`) may restrict access to dropped files or prevent execution of external helper engines.
  - Mitigation: Request user-selected security-scoped bookmarks where necessary; sign and notarize binaries according to Apple guidelines.
- Color Management:
  - Risk: Display P3 color spaces on macOS screens can result in washed-out colors when converting sRGB images without embedded ICC profiles.
  - Mitigation: Explicitly preserve or attach sRGB ICC metadata during image transcoding.

## 3. Linux Risks
- WebKitGTK and Graphics Acceleration:
  - Risk: Inconsistent WebKitGTK versions across distributions (Debian, Ubuntu, Fedora, Arch) can lead to rendering artifacts or missing hardware acceleration.
  - Mitigation: Avoid non-standard CSS properties; test with standard WebKitGTK packages; provide AppImage and Flatpak distributions with bundled runtimes.
- Desktop File Drag-and-Drop:
  - Risk: Differences in Wayland vs. X11 clipboard and drag-and-drop protocols (`text/uri-list` vs. native file descriptors).
  - Mitigation: Implement dual-layer drop handling in Tauri 2 supporting both native window drag-drop events and webview file transfer APIs.

## 4. General Cross-Platform Engine Risks
- Resource Exhaustion:
  - Risk: Processing massive image files (e.g., 200MP panoramas) or malformed recursive archives can cause unbounded memory allocation and crash the application.
  - Mitigation: Implement dimension limits and memory budgeting prior to decompression. Enforce hard execution timeouts on background conversion tasks.
