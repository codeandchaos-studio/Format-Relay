// Names Setup shares with FormatRelay 1.x's Inno Setup installer, the app and Windows. Changing one breaks updates.

namespace FormatRelay.Setup.Installation;

public static class SetupNames
{
    /// <summary>
    /// Inno Setup's AppId of FormatRelay (installer/FormatRelay.iss, 1.x). Apps &amp; Features lists FormatRelay under the uninstall key
    /// "{id}_is1"; Setup keeps that key, so an update from 1.x leaves one entry.
    /// </summary>
    public const string AppGuid = "C8686E06-8327-40A2-B0F7-3DEDD61D9248";

    public const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\{" + AppGuid + "}_is1";

    /// <summary>FormatRelay 1.1 and earlier: Velopack installed it per user and registered it here (HKCU).</summary>
    public const string VelopackUninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\FormatRelay";

    public const string MachineEnvironmentKey = @"SYSTEM\CurrentControlSet\Control\Session Manager\Environment";
    public const string UserEnvironmentKey = "Environment";

    public const string AppName = "Format Relay";
    public const string Publisher = "Code & Chaos Studio";
    public const string AppExe = "FormatRelay.exe";

    /// <summary>The uninstaller next to FormatRelay.exe (UpdateService.IsInstalled looks for it).</summary>
    public const string UninstallerExe = "uninstall.exe";

    /// <summary>The list of installed files next to FormatRelay.exe: what the uninstaller removes and an update replaces.</summary>
    public const string InstallRecordFile = "uninstall.json";

    /// <summary>The "format-relay" command (cli\formatrelay.cmd), the folder Setup puts on PATH.</summary>
    public const string CliFolder = "cli";

    /// <summary>Inno Setup's uninstaller files, removed when Setup takes over a 1.x installation.</summary>
    public static readonly IReadOnlyList<string> InnoUninstallerFiles = ["unins000.exe", "unins000.dat", "unins000.msg"];

    /// <summary>Start menu and desktop shortcut name.</summary>
    public const string ShortcutName = "Format Relay.lnk";

    /// <summary>Registry values Setup adds to the uninstall key (Inno Setup kept the same in "Inno Setup: …").</summary>
    public const string TasksValue = "FormatRelay Setup: Tasks";
    public const string LanguageValue = "FormatRelay Setup: Language";
    public const string ScopeValue = "FormatRelay Setup: Scope";
    public const string InnoTasksValue = "Inno Setup: Selected Tasks";
    public const string InnoAppPathValue = "Inno Setup: App Path";
    public const string InnoVersionValue = "Inno Setup: Setup Version";
    public const string InnoLanguageValue = "Inno Setup: Language";

    /// <summary>Windows 10 1809: the oldest Windows FormatRelay runs on (Inno Setup's MinVersion).</summary>
    public const int MinimumBuild = 17763;

    /// <summary>Where Microsoft offers the Visual C++ Redistributable (x64).</summary>
    public const string VcRedistUrl = "https://aka.ms/vs/17/release/vc_redist.x64.exe";
}
