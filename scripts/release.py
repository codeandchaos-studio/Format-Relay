import os
import sys
import re
import subprocess
import shutil
import json
import urllib.request
import urllib.parse
import urllib.error

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")
PROPS_FILE = os.path.join(SRC_DIR, "Directory.Build.props")
PACKAGE_JSON = os.path.join(ROOT_DIR, "package.json")
RELEASE_WIN_DIR = os.path.join(ROOT_DIR, "dist", "release", "windows")
DOTNET_DIR = r"C:\Users\Dharshan.V\.dotnet"
DOTNET_EXE = os.path.join(DOTNET_DIR, "dotnet.exe") if os.path.exists(os.path.join(DOTNET_DIR, "dotnet.exe")) else "dotnet"

STUDIO_URL = "https://codeandchaos-studio.pages.dev/"
REPO_OWNER = "codeandchaos-studio"
REPO_NAME = "Format-Relay"

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

def kill_running_instances():
    try:
        subprocess.run(["taskkill", "/F", "/IM", "FormatRelay.exe"], capture_output=True)
        subprocess.run(["taskkill", "/F", "/IM", "FORMAT_RELAY_Portable.exe"], capture_output=True)
    except Exception:
        pass

def build_executables(version):
    kill_running_instances()
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
🌐 **Official Portal:** [{STUDIO_URL}]({STUDIO_URL})  
📁 **Repository:** [github.com/{REPO_OWNER}/{REPO_NAME}](https://github.com/{REPO_OWNER}/{REPO_NAME})

---

### ⚡ Key Highlights & Features
- **Tactical Format Wheel:** Rapid-fire flick-and-release radial tool under your cursor (Shift + Drag in Explorer).
- **Warm Cream & Flame Brand Aesthetic:** Premium bespoke light-themed design with zero eye-strain and obsidian typography.
- **Top Navigation Bar:** Streamlined modern interface with maximum workspace canvas.
- **Automatic Patch Notifications:** In-app update notifications with one-click background upgrades.
- **High-Performance Engines:** 100% offline, local-first conversion across images, documents, audio, CAD, and 3D.
- **Zero Cloud Dependency:** Completely private, telemetry-free, lifetime free utility.

### 📦 Release Deliverables
- `FORMAT_RELAY_{version}_Setup.exe`: Official Windows Installer with frameless wordmark loading animations
- `FORMAT_RELAY_Portable.exe`: Standalone portable zero-install single executable
"""

def get_github_token():
    # 1. Environment variables
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token.strip()

    # 2. Git credential helper
    try:
        p = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n", capture_output=True, text=True)
        for line in p.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None

def publish_github_release(version, notes_content):
    token = get_github_token()
    if not token:
        print("\n[WARNING] GitHub token not detected. Git tags were pushed, but release was not published via API.")
        print(f"To create release manually, visit: https://github.com/{REPO_OWNER}/{REPO_NAME}/releases/new?tag=v{version}")
        return

    tag_name = f"v{version}"
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "FormatRelay-ReleaseTool",
        "Accept": "application/vnd.github+json"
    }

    # 1. Check if release already exists
    print(f"\nPublishing GitHub Release for {tag_name} on {REPO_OWNER}/{REPO_NAME}...")
    release_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases"
    existing_release = None
    try:
        req = urllib.request.Request(f"{release_url}/tags/{tag_name}", headers=headers)
        with urllib.request.urlopen(req) as resp:
            existing_release = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"Error checking existing release: {e}")

    release_payload = {
        "tag_name": tag_name,
        "target_commitish": "main",
        "name": f"Format Relay v{version}",
        "body": notes_content,
        "draft": False,
        "prerelease": False
    }

    if existing_release:
        release_id = existing_release["id"]
        print(f"Release {tag_name} already exists (ID: {release_id}). Updating release metadata...")
        req = urllib.request.Request(
            f"{release_url}/{release_id}",
            data=json.dumps(release_payload).encode("utf-8"),
            headers=headers,
            method="PATCH"
        )
        with urllib.request.urlopen(req) as resp:
            release_data = json.loads(resp.read().decode("utf-8"))
    else:
        req = urllib.request.Request(
            release_url,
            data=json.dumps(release_payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            release_data = json.loads(resp.read().decode("utf-8"))
        release_id = release_data["id"]

    print(f"Release successfully created/updated: {release_data.get('html_url')}")

    # 2. Upload assets (Installer and Portable exe)
    assets_to_upload = [
        os.path.join(RELEASE_WIN_DIR, f"FORMAT_RELAY_{version}_Setup.exe"),
        os.path.join(RELEASE_WIN_DIR, "FORMAT_RELAY_Portable.exe")
    ]

    # Delete any duplicate existing assets
    existing_assets = release_data.get("assets", [])
    for asset in existing_assets:
        asset_name = asset.get("name")
        if asset_name in [os.path.basename(a) for a in assets_to_upload]:
            print(f"Removing old asset {asset_name} (ID: {asset['id']})...")
            del_req = urllib.request.Request(
                f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/assets/{asset['id']}",
                headers=headers,
                method="DELETE"
            )
            try:
                with urllib.request.urlopen(del_req) as resp:
                    pass
            except Exception as e:
                print(f"Warning: could not delete asset {asset_name}: {e}")

    for file_path in assets_to_upload:
        if not os.path.exists(file_path):
            print(f"[WARNING] File not found: {file_path}, skipping upload.")
            continue
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        print(f"Uploading asset: {file_name} ({file_size / (1024*1024):.1f} MB)...", flush=True)

        upload_url = f"https://uploads.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/{release_id}/assets?name={urllib.parse.quote(file_name)}"
        with open(file_path, "rb") as f:
            file_data = f.read()

        upload_headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "FormatRelay-ReleaseTool",
            "Content-Type": "application/octet-stream",
            "Content-Length": str(file_size)
        }
        upload_req = urllib.request.Request(upload_url, data=file_data, headers=upload_headers, method="POST")
        try:
            with urllib.request.urlopen(upload_req, timeout=300) as resp:
                asset_resp = json.loads(resp.read().decode("utf-8"))
                print(f" -> Uploaded: {asset_resp.get('browser_download_url')}")
        except Exception as e:
            print(f"Failed to upload {file_name}: {e}")

    print(f"\n[RELEASE COMPLETE] Live at: {release_data.get('html_url')}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/release.py [current|first|patch|minor|major|build-only]")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "build-only":
        major, minor, patch = get_current_version()
        v = f"{major}.{minor}.{patch}"
        build_executables(v)
        return

    valid_commands = ["current", "first", "init", "patch", "minor", "major"]
    if cmd not in valid_commands and not cmd.startswith("v1."):
        print(f"Unknown release type '{cmd}'. Use current (or first), patch, minor, or major.")
        sys.exit(1)

    if cmd in ["current", "first", "init"] or cmd.startswith("v1."):
        major, minor, patch = get_current_version()
        new_v = f"{major}.{minor}.{patch}"
        print(f"=== Releasing current version: v{new_v} (No version bump) ===")
    else:
        old_v, new_v = bump_version(cmd)
        print(f"=== Bumping version: v{old_v} -> v{new_v} ({cmd}) ===")
        update_version_files(new_v)

    # Check if binaries exist, if not build them
    installer_path = os.path.join(RELEASE_WIN_DIR, f"FORMAT_RELAY_{new_v}_Setup.exe")
    portable_path = os.path.join(RELEASE_WIN_DIR, "FORMAT_RELAY_Portable.exe")
    if not os.path.exists(installer_path) or not os.path.exists(portable_path):
        build_executables(new_v)
    else:
        print(f"Found existing release deliverables in {RELEASE_WIN_DIR}:")
        print(f" - {os.path.basename(installer_path)}")
        print(f" - {os.path.basename(portable_path)}")

    notes = create_release_notes(new_v)
    notes_file = os.path.join(ROOT_DIR, "RELEASE_NOTES.md")
    with open(notes_file, "w", encoding="utf-8") as f:
        f.write(notes)

    # Git commit and tag
    print("\nCommitting and tagging release...")
    run_cmd(["git", "-C", ROOT_DIR, "add", "-A"])
    commit_msg = f"feat: release v{new_v} - Format Relay official release"
    try:
        run_cmd(["git", "-C", ROOT_DIR, "commit", "-m", commit_msg])
    except Exception as e:
        print(f"Commit note: {e}")

    tag_name = f"v{new_v}"
    # Delete existing tag locally if re-releasing current version
    subprocess.run(["git", "-C", ROOT_DIR, "tag", "-d", tag_name], capture_output=True)
    run_cmd(["git", "-C", ROOT_DIR, "tag", "-a", tag_name, "-m", f"Format Relay {tag_name}"])

    print("\nPushing to GitHub (main, master, and tags)...")
    run_cmd(["git", "-C", ROOT_DIR, "push", "origin", "main", "--tags", "--force"])
    run_cmd(["git", "-C", ROOT_DIR, "push", "origin", "main:master", "--tags", "--force"])

    # Publish GitHub Release with assets
    publish_github_release(new_v, notes)

    print(f"\n[SUCCESS] Successfully released Format Relay v{new_v}!")
    print(f"Tag: {tag_name}")
    print(f"Website: {STUDIO_URL}")
    print(f"GitHub: https://github.com/{REPO_OWNER}/{REPO_NAME}/releases")

if __name__ == "__main__":
    main()
