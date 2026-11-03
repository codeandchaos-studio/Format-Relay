using System.Reflection;

namespace FormatRelay.Setup;

/// <summary>Facts about this Setup program.</summary>
public static class SetupInfo
{
    /// <summary>GitHub repository from Directory.Build.props (FormatRelayRepositoryUrl).</summary>
    public static string RepositoryUrl =>
        typeof(SetupInfo).Assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
            .FirstOrDefault(a => a.Key == "RepositoryUrl")?.Value ?? "https://github.com/codeandchaos-studio/Format-Relay";

    /// <summary>The website: one big download button.</summary>
    public const string WebsiteUrl = "https://codeandchaos.studio/";

    /// <summary>The version this Setup program was built as (the payload says which FormatRelay it installs).</summary>
    public static string Version =>
        typeof(SetupInfo).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0] ?? "0.0.0";
}
