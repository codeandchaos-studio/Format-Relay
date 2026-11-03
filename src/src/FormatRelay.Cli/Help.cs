// Usage text of the "format-relay" command.

using System.Reflection;
using FormatRelay.Core.Watching;

namespace FormatRelay.Cli;

internal static class Help
{
    public static string Version =>
        typeof(Help).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+')[0] ?? "?";

    public static string Text(string? command) => command?.ToLowerInvariant() switch
    {
        "convert" => Convert,
        "watch" => Watch,
        "formats" => "Usage: format-relay formats [<format>] [--json]\n\nLists every format, or what one format converts to.\n" +
                     "With --json, prints the same as JSON (for scripts and other programs).\n",
        "presets" => "Usage: format-relay presets [--json]\n\nLists the presets saved in FormatRelay (built-in and your own).\n" +
                     "With --json, prints the same as JSON (for scripts and other programs).\n",
        "engines" => Engines,
        _ => General,
    };

    private const string General = """
        FormatRelay: convert files offline from the command line.

        Usage:
          format-relay convert <files or folders...> --to <format> [options]
          format-relay convert <files or folders...> --preset <preset> [options]
          format-relay watch <folder> --to <format> [options]
          format-relay formats [<format>] [--json]
          format-relay presets [--json]
          format-relay engines [--json]
          format-relay engines (install | remove) <engine> [--json]
          format-relay help [<command>]
          format-relay version

        Examples:
          format-relay convert photo.heic --to jpg
          format-relay convert *.png --to webp --quality 80 -o converted
          format-relay convert D:\Scans --recursive --preset to-pdf
          format-relay watch D:\Inbox --to pdf --move-originals
          format-relay engines install pandoc

        Presets and engines are the ones in the FormatRelay app. Exit codes: 0 nothing failed (skipped
        files included), 1 some failed or were cancelled, 2 wrong arguments or a missing input, 3 nothing to
        convert.

        """;

    private const string Engines = """
        Usage: format-relay engines [--json]
               format-relay engines install <engine> [--json] [--quiet]
               format-relay engines remove <engine> [--json] [--quiet]

        Lists the optional engines of Settings → Engines (LibreOffice, Pandoc, FFmpeg, …), or installs or removes
        one with the same download and checks as the app. 'remove' only removes what FormatRelay downloaded; your own copy
        and one found on this computer are left alone.

        In the JSON of the list, "version" is the version FormatRelay downloads, also for an engine whose status is
        "owncopy" (your own copy or one found on this computer).

        Options:
              --json             Print the result as JSON; progress goes to stderr, one JSON object per line
              --quiet            Print nothing but errors

        """;

    private const string Convert = """
        Usage: format-relay convert <files or folders...> (--to <format> | --preset <preset>) [options]

        Files can be wildcards (*.heic). Folders convert the files in them that FormatRelay knows.

        Options:
          -t, --to <format>      Target format, e.g. jpg, png, pdf, docx, mp4 (see 'format-relay formats')
          -p, --preset <preset>  A preset from the app, by id or name (see 'format-relay presets')
          -o, --output <folder>  Save there instead of next to the sources
          -r, --recursive        Include sub folders
              --sort <order>     The order files merge in: name, name-desc, modified, modified-desc, created or
                                 created-desc (default: as given; a folder or wildcard as the file system lists it).
                                 By name, each folder's files stay together, sub folders first. Where a file has
                                 no creation date (some Linux file systems), created uses its change or modified date
          -q, --quality <1-100>  Image quality for JPG, WebP, AVIF, …
              --overwrite        Replace existing output files (default: add a number)
              --skip             Leave existing output files alone
              --keep-dates       Give converted files the created and modified dates of the originals
              --zip              Save the result of each file as one ZIP (a Shapefile's files together)
              --json             Print the result as JSON (for scripts and other programs)
              --quiet            Print nothing but errors

        """;

    private static string Watch => FormattableString.Invariant($"""
        Usage: format-relay watch <folder> (--to <format> | --preset <preset>) [options]

        Converts files that land in the folder until Ctrl+C. Files are converted once they are complete (no
        longer growing or open in another program). Output goes to a "converted" folder inside it unless -o is given.

        Options:
          -t, --to <format>      Target format
          -p, --preset <preset>  A preset from the app, by id or name
          -o, --output <folder>  Where converted files go (default: <folder>\converted)
          -r, --recursive        Also watch sub folders (their files keep the sub folder in the output)
              --move-originals   Move converted sources to <folder>\originals; files already waiting are
                                 converted at start
              --settle <seconds> How long a file must stay unchanged (default {FolderWatcher.DefaultSettleTime.TotalSeconds})
              --keep-dates       Give converted files the created and modified dates of the originals
              --zip              Save the result of each file as one ZIP (a Shapefile's files together)
              --quiet            Print nothing but errors

        """);
}
