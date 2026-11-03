import os
import sys
import re
import subprocess
import shutil
import json

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")
PROPS_FILE = os.path.join(SRC_DIR, "Directory.Build.props")
PACKAGE_JSON = os.path.join(ROOT_DIR, "package.json")
RELEASE_WIN_DIR = os.path.join(ROOT_DIR, "dist", "release", "windows")
DOTNET_DIR = r"C:\Users\Dharshan.V\.dotnet"
DOTNET_EXE = os.path.join(DOTNET_DIR, "dotnet.exe") if os.path.exists(os.path.join(DOTNET_DIR, "dotnet.exe")) else "dotnet"

env = os.environ.copy()
env["DOTNET_ROOT"] = DOTNET_DIR
env["PATH"] = DOTNET_DIR + ";" + env.get("PATH", "")

def run_cmd(cmd, cwd=ROOT_DIR):
    print(f"\n[EXEC] {' '.join(cmd)} in {cwd}", flush=True)
    res = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[STDOUT]\n{res.stdout}", flush=True)
        print(f"[STDERR]\n{res.stderr}", flush=True)
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res.stdout.strip()

def get_current_version():
    with open(PROPS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r"<Version>([0-9]+)\.([0-9]+)\.([0-9]+)</Version>", content)
    if not m:
        return 1, 0, 0
    return int(m.group(1)), int(m.group(2)), int(m.group(3))

def bump_version(release_type):
    major, minor, patch = get_current_version()
    old_version = f"{major}.{minor}.{patch}"
    if release_type == "patch":
        patch += 1
    elif release_type == "minor":
        minor += 1
        patch = 0
    elif release_type == "major":
        major += 1
        minor = 0
        patch = 0
    new_version = f"{major}.{minor}.{patch}"
    return old_version, new_version

def update_version_files(new_version):
    # 1. Directory.Build.props
    with open(PROPS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    content = re.sub(r"<Version>[0-9]+\.[0-9]+\.[0-9]+</Version>", f"<Version>{new_version}</Version>", content)
    with open(PROPS_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    # 2. package.json
    if os.path.exists(PACKAGE_JSON):
        with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
            pj = json.load(f)
        pj["version"] = new_version
        with open(PACKAGE_JSON, "w", encoding="utf-8") as f:
            json.dump(pj, f, indent=2)

    print(f"Updated version to {new_version} in Directory.Build.props and package.json")

def build_executables(version):
    print(f"\nBuilding Format Relay v{version} deliverables...")
    portable_temp = os.path.join(ROOT_DIR, "scratch", "portable-extracted")
    setup_temp = os.path.join(ROOT_DIR, "scratch", "setup-out")
    single_temp = os.path.join(ROOT_DIR, "scratch", "singlefile-out")

    for d in [portable_temp, setup_temp, single_temp]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
    os.makedirs(RELEASE_WIN_DIR, exist_ok=True)

    # 1. FormatRelay.App
    run_cmd([
        DOTNET_EXE, "publish", os.path.join(SRC_DIR, "src", "FormatRelay.App", "FormatRelay.App.csproj"),
        "-c", "Release", "-r", "win-x64", "--self-contained", "true",
        f"-p:Version={version}", "-p:PublishReadyToRun=true", "-p:FormatRelayRelease=true",
        "-o", portable_temp
    ], cwd=SRC_DIR)

    # 2. FormatRelay.Cli
    run_cmd([
        DOTNET_EXE, "publish", os.path.join(SRC_DIR, "src", "FormatRelay.Cli", "FormatRelay.Cli.csproj"),
        "-c", "Release", "-r", "win-x64", "--self-contained", "true",
        f"-p:Version={version}", "-p:PublishReadyToRun=true", "-p:FormatRelayRelease=true",
        "-o", portable_temp
    ], cwd=SRC_DIR)

    # 3. FormatRelay.Setup
    run_cmd([
        DOTNET_EXE, "publish", os.path.join(SRC_DIR, "src", "FormatRelay.Setup", "FormatRelay.Setup.csproj"),
        "-c", "Release", "-r", "win-x64", "-p:FormatRelaySetupPublish=true",
        f"-p:Version={version}", "-o", setup_temp
    ], cwd=SRC_DIR)

    # 4. make-setup.cs
    setup_program = os.path.join(setup_temp, "FormatRelay.Setup.exe")
    output_installer = os.path.join(RELEASE_WIN_DIR, f"FORMAT_RELAY_{version}_Setup.exe")
    run_cmd([
        DOTNET_EXE, "run", "--no-cache", os.path.join(SRC_DIR, "build", "tools", "make-setup.cs"), "--",
        setup_program, portable_temp, version, output_installer
    ], cwd=SRC_DIR)

    # 5. Standalone singlefile portable
    run_cmd([
        DOTNET_EXE, "publish", os.path.join(SRC_DIR, "src", "FormatRelay.App", "FormatRelay.App.csproj"),
        "-c", "Release", "-r", "win-x64", "--self-contained", "true",
        "-p:PublishSingleFile=true", "-p:IncludeNativeLibrariesForSelfExtract=true",
        "-p:EnableCompressionInSingleFile=true", f"-p:Version={version}",
        "-o", single_temp
    ], cwd=SRC_DIR)

    portable_dest = os.path.join(RELEASE_WIN_DIR, "FORMAT_RELAY_Portable.exe")
    shutil.copyfile(os.path.join(single_temp, "FormatRelay.exe"), portable_dest)

    # Clean extraneous files in dist/release/windows so ONLY two .exe exist
    valid_files = [f"FORMAT_RELAY_{version}_Setup.exe", "FORMAT_RELAY_Portable.exe"]
    for f in os.listdir(RELEASE_WIN_DIR):
        if f not in valid_files:
            try:
                os.remove(os.path.join(RELEASE_WIN_DIR, f))
            except:
                pass

    print(f"\nGenerated release files in {RELEASE_WIN_DIR}:")
    print(f" - {os.path.basename(output_installer)} ({os.path.getsize(output_installer)} bytes)")
    print(f" - {os.path.basename(portable_dest)} ({os.path.getsize(portable_dest)} bytes)")

def create_release_notes(version):
    return f"""# Format Relay v{version}

**Official Release by Code & Chaos Studio**

### ⚡ Key Highlights & Features
- **Tactical Format Wheel:** Rapid-fire flick-and-release conversion under your cursor.
- **Top Navigation Bar:** Streamlined modern interface with maximum workspace canvas.
- **Automatic Patch Notifications:** In-app update alerts for new releases with one-click update.
- **High-Performance Engines:** 100% offline local conversion with zero cloud telemetry.

### 📦 Release Deliverables
- `FORMAT_RELAY_{version}_Setup.exe`: Official Windows Installer with custom branding
- `FORMAT_RELAY_Portable.exe`: Standalone portable zero-install executable
"""

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/release.py [patch|minor|major|build-only]")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "build-only":
        major, minor, patch = get_current_version()
        v = f"{major}.{minor}.{patch}"
        build_executables(v)
        return

    if cmd not in ["patch", "minor", "major"]:
        print(f"Unknown release type '{cmd}'. Use patch, minor, or major.")
        sys.exit(1)

    old_v, new_v = bump_version(cmd)
    print(f"=== Bumping version: v{old_v} -> v{new_v} ({cmd}) ===")
    update_version_files(new_v)
    build_executables(new_v)

    notes = create_release_notes(new_v)
    notes_file = os.path.join(ROOT_DIR, "RELEASE_NOTES.md")
    with open(notes_file, "w", encoding="utf-8") as f:
        f.write(notes)

    # Git commit and tag
    print("\nCommitting and tagging release...")
    run_cmd(["git", "-C", ROOT_DIR, "add", "-A"])
    commit_msg = f"feat: release v{new_v} - Format Relay official release"
    run_cmd(["git", "-C", ROOT_DIR, "commit", "-m", commit_msg])
    tag_name = f"v{new_v}"
    run_cmd(["git", "-C", ROOT_DIR, "tag", "-a", tag_name, "-m", f"Format Relay {tag_name}"])

    print("\nPushing to GitHub (main, master, and tags)...")
    run_cmd(["git", "-C", ROOT_DIR, "push", "origin", "main", "--tags"])
    run_cmd(["git", "-C", ROOT_DIR, "push", "origin", "main:master"])

    print(f"\n[SUCCESS] Successfully released Format Relay v{new_v}!")
    print(f"Tag: {tag_name}")
    print(f"GitHub: https://github.com/codeandchaos-studio/Format-Relay/releases")

if __name__ == "__main__":
    main()
