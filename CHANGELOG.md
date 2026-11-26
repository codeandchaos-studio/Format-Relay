# Changelog

All notable changes to **Format Relay** by **Code & Chaos Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-11-26
### ⚡ Added Feature: Presets & Quick-Profiles System
In this release, we've activated the complete **Presets & Quick-Profiles** workspace, giving you fast, reusable conversion recipes:
- **Dedicated Presets Navigation:** New **Presets** tab located in the top navigation bar (`[Home] [General] [Presets] [Shortcuts] [Engines] [About]`).
- **Custom Conversion Recipes:** Create, save, and manage custom profiles specifying target output format, encoding quality percentage, dimensions, aspect ratio lock, and image rotation/flip rules.
- **Subfolder Organization Rules:** Route converted outputs into custom subdirectories automatically based on active preset settings.
- **Search & Quick-Start:** Instant in-line search across preset profiles with ready-to-use factory templates.
- **Dynamic Header Version Badge:** The header version badge now dynamically binds to the active app version (`v1.1.0`).

---

## [1.0.1] - 2026-11-16
### 🐛 Updates & Improvements
This patch release brings critical updater enhancements and portal synchronization:
- **In-App Updater Reliability:** Fixed update package resolution in `UpdateService` to support generic setup asset naming and backward-compatible mirror assets (`FormatRelay-<version>-win-Setup.exe`).
- **Cryptographic Verification:** Added automated SHA-256 integrity checksum generation (`FormatRelay-<version>-SHA256SUMS.txt`) ensuring secure, tamper-proof background downloads.
- **Official Studio Portal Update:** Synchronized all in-app portal links, error dialogs, and fallback download prompts to `https://codeandchaos.dpdns.org/`.
- **Automated Rebuild Pipeline:** Release tooling now guarantees clean, fresh compilation of all deliverables for every version bump.

---

## [1.0.0] - 2026-11-03
### ⚡ Initial Launch
Initial public release of Format Relay — the tactical, local-first conversion suite:
- **Tactical Format Wheel:** Rapid-fire flick-and-release radial tool under your cursor (Shift + Drag in Explorer).
- **Warm Cream & Flame Brand Aesthetic:** Premium bespoke light-themed design (`#F4EEE0`, `#FAF8EC`, `#1A1915`, `#EA4122`) with zero eye-strain and obsidian typography.
- **Top Navigation Bar:** Streamlined modern interface with maximum workspace canvas across Home, General, Shortcuts, Engines, and About sections.
- **Frameless Wordmark Setup:** Installer and uninstaller featuring frameless animated wordmark progress flows.
- **High-Performance Engines:** 100% offline, local-first conversion across images, documents, audio, CAD, and 3D with zero cloud dependency.
- **Zero Cloud Dependency:** Completely private, telemetry-free, lifetime free utility.
