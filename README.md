# FORMAT RELAY

> Every file. Ready for what's next.

Format Relay is a desktop file conversion and utility suite engineered for privacy, speed, and deterministic output verification. Process images, documents, structured data, and media entirely on your local machine without third-party cloud uploads, mandatory accounts, subscriptions, or telemetry.

---

### Studio Identity
- Studio: CODE & CHAOS
- Tagline: we built stuff
- Team: Independent collective of three developers
- License: Code & Chaos Source-Available View-Only License

---

## Key Principles
- 100% Local-First: All file operations, conversions, and metadata inspections execute directly on your local hardware.
- Zero Background Telemetry: No analytics, tracking pixels, session recorders, or external network reporting.
- Deterministic Verification: Every output file is decoded and validated for structural integrity before being presented as completed.
- Safe Staging: Original input files are never modified. Conversions are written to temporary working locations and committed atomically.
- Zero Paywalls: Completely free with zero subscriptions, zero advertisements, and zero artificial limits.

---

## Architecture Overview
The application is structured into two primary layers:
1. Native Core (Rust): Houses the conversion engine adapters, file inspector (magic byte signatures), job queue orchestrator, atomic output manager, and SQLite persistence.
2. Interface (React, TypeScript, Vite, Tailwind CSS): Provides a tactile, keyboard-navigable, and responsive workspace for batch queue inspection and conversion configuration.

For in-depth technical documentation, refer to:
- [Architecture](ARCHITECTURE.md)
- [Requirements](REQUIREMENTS.md)
- [Dependencies and Engine Plan](DEPENDENCIES.md)
- [Roadmap](ROADMAP.md)
- [Testing Strategy](TESTING.md)
- [Platform-Specific Risks](PLATFORM_RISKS.md)

---

## Building from Source

### Prerequisites
- Node.js (v20 or higher) and npm
- Rust toolchain (v1.80 or higher with Cargo)
- Platform C++ build tools (MSVC on Windows, Xcode tools on macOS, build-essential on Linux)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd "Format Relay"

# Install frontend dependencies
npm install

# Run frontend development server
npm run dev

# Run Tauri desktop application in development mode
npm run tauri dev
```

---

## License
Format Relay is released under the Code & Chaos Source-Available View-Only License. All rights reserved. See [LICENSE](LICENSE) for terms and conditions.
