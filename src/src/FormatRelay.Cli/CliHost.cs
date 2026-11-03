// The conversion pipeline without the app: the user's settings and presets, every engine (bundled ones next to the
// executable, downloaded ones in the per-user engines folder) and a job queue. Mirrors AppHost in FormatRelay.App.

using FormatRelay.Core.Conversion;
using FormatRelay.Core.Localization;
using FormatRelay.Core.Platform;
using FormatRelay.Core.Settings;
using FormatRelay.Engines;
using FormatRelay.Engines.Infrastructure;

namespace FormatRelay.Cli;

internal sealed class CliHost : IAsyncDisposable
{
    private EngineInstaller? _engines;

    /// <param name="engines">Installer of the optional engines; the app's (per-user engines folder) when null.</param>
    internal CliHost(UserDataStore store, ConverterCatalog catalog, JobQueue queue, EngineInstaller? engines = null)
    {
        Store = store;
        Catalog = catalog;
        Queue = queue;
        _engines = engines;
    }

    public UserDataStore Store { get; }
    public ConverterCatalog Catalog { get; }
    public JobQueue Queue { get; }
    public ILocalizer Texts { get; } = new EnglishTexts();

    /// <summary>
    /// The installer Settings → Engines uses, on EngineEnvironment.DownloadRoot (the engines folder in FORMAT_RELAY_DATA_DIR
    /// when that is set). Created when 'format-relay engines' first needs it.
    /// </summary>
    public EngineInstaller Engines => _engines ??= new EngineInstaller(EngineInstaller.CreateHttpClient(Timeout.InfiniteTimeSpan));

    /// <param name="dataDirectory">Settings folder; the app's (%APPDATA%\FormatRelay) when null.</param>
    /// <param name="engines">Installer of the optional engines (tests pass one with their own folder and downloads).</param>
    public static CliHost Create(string? dataDirectory = null, EngineInstaller? engines = null)
    {
        var store = new UserDataStore(dataDirectory ?? UserDataStore.DefaultDirectory);
        store.Load();
        EngineEnvironment.OwnCopies = new Dictionary<string, string>(store.Settings.EngineOwnCopies);
        EngineEnvironment.LibreOfficeForSlides = store.Settings.LibreOfficeForSlides;
        EngineEnvironment.LibreOfficeForHwp = store.Settings.LibreOfficeForHwp;
        EngineEnvironment.LibreOfficeForDocuments = store.Settings.LibreOfficeForDocuments;
        EngineEnvironment.LibreOfficeForSheets = store.Settings.LibreOfficeForSheets;
        var converters = EngineRegistry.CreateAll(new EngineEnvironment(store.Directory));
        var catalog = new ConverterCatalog(converters) { Priority = store.Settings.EnginePriority };
        var queue = new JobQueue(catalog, EngineRegistry.FindPdfMerger(converters), combiner: EngineRegistry.FindFileCombiner(converters),
            tiffMerger: EngineRegistry.FindTiffMerger(converters), mediaJoiner: EngineRegistry.FindMediaJoiner(converters),
            moveToTrash: Trash());
        return new CliHost(store, catalog, queue, engines);
    }

    /// <summary>The system's Recycle Bin / Trash for "Replace the original", as in the app; none elsewhere.</summary>
    private static Func<string, TrashRefusal?>? Trash() =>
        OperatingSystem.IsWindows() ? new FormatRelay.Platform.Windows.WindowsPlatformServices().MoveToTrash
        : OperatingSystem.IsMacOS() ? new FormatRelay.Platform.MacOS.MacOSPlatformServices().MoveToTrash
        : OperatingSystem.IsLinux() ? new FormatRelay.Platform.Linux.LinuxPlatformServices().MoveToTrash
        : null;

    public ValueTask DisposeAsync() => Queue.DisposeAsync();
}
