// Applies ThemeSettings (light/dark, accent colour, corner radius, font order and reading direction, reduced motion) and the user's
// theme.json colours at runtime by writing resources into Application.Resources. All styles reference these with
// DynamicResource.

using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.Styling;
using FormatRelay.Core.Platform;
using FormatRelay.Core.Settings;

namespace FormatRelay.App.Services;

/// <summary>Runtime theming.</summary>
public sealed class ThemeService(IPlatformServices platform)
{
    private readonly IPlatformServices _platform = platform;

    /// <summary>Applies or removes the "material-you" style class on a window.</summary>
    public void ApplyWindowClass(Window window) => window.Classes.Set("material-you", IsMaterialYou);

    /// <summary>Accent swatches offered in the Theme page.</summary>
    public static readonly IReadOnlyList<string> Swatches =
        ["#6366F1", "#4F46E5", "#0EA5E9", "#38BDF8", "#10B981", "#8B5CF6", "#EC4899", "#1E293B", "#F8FAFC"];

    /// <summary>Curated theme preset with coordinated light and dark accent colours.</summary>
    public sealed record ThemePreset(string Key, string LightHex, string DarkHex)
    {
        public Color LightColor => Color.Parse(LightHex);
        public Color DarkColor => Color.Parse(DarkHex);
        public Color ActiveColor(bool isDark) => isDark ? DarkColor : LightColor;
    }

    /// <summary>Curated pastel and monochrome presets offered in the Theme page.</summary>
    public static readonly IReadOnlyList<ThemePreset> Presets =
    [
        new("indigo", "#4F46E5", "#6366F1"),
        new("cyan", "#0284C7", "#38BDF8"),
        new("emerald", "#059669", "#34D399"),
        new("violet", "#7C3AED", "#A78BFA"),
        new("rose", "#E11D48", "#FB7185"),
        new("slate", "#334155", "#94A3B8"),
        new("sky", "#0369A1", "#0EA5E9"),
        new("dark", "#0F172A", "#F8FAFC"),
    ];

    /// <summary>Currently applied theme style.</summary>
    public ThemeStyle CurrentStyle { get; private set; } = ThemeStyle.Soft;

    /// <summary>True when Material You is currently applied.</summary>
    public bool IsMaterialYou => CurrentStyle == ThemeStyle.MaterialYou;

    /// <summary>
    /// theme.json colour names → the brushes in Styles/Soft.axaml they replace. Must cover exactly
    /// <see cref="CustomTheme.Keys"/> (a test checks).
    /// </summary>
    internal static readonly IReadOnlyDictionary<string, string> CustomBrushKeys = new Dictionary<string, string>
    {
        ["page"] = "PageBrush",
        ["surface"] = "SurfaceBrush",
        ["surfaceAlt"] = "SurfaceAltBrush",
        ["border"] = "SubtleBorderBrush",
        ["text"] = "TextPrimaryBrush",
        ["textSecondary"] = "TextSecondaryBrush",
        ["danger"] = "DangerBrush",
        ["success"] = "SuccessBrush",
        ["warning"] = "WarningBrush",
    };

    public void Apply(ThemeSettings theme, string language, CustomTheme? custom = null)
    {
        var app = Application.Current ?? throw new InvalidOperationException("No application.");
        var res = app.Resources;

        CurrentStyle = theme.Style;

        app.RequestedThemeVariant = theme.Mode switch
        {
            ThemeMode.Light => ThemeVariant.Light,
            ThemeMode.Dark => ThemeVariant.Dark,
            _ => ThemeVariant.Default,
        };

        // Determine effective accent colors:
        // If a coordinated light/dark preset is active, use its respective variant colors.
        ThemePreset? preset = null;
        if (!string.IsNullOrEmpty(theme.PresetKey))
            preset = Presets.FirstOrDefault(p => string.Equals(p.Key, theme.PresetKey, StringComparison.OrdinalIgnoreCase));

        var defaultColor = Color.Parse(SoftPalette.DefaultAccent);
        var baseColor = Color.TryParse(theme.Accent, out var parsed) ? parsed : defaultColor;

        var lightAccent = preset?.LightColor ?? baseColor;
        var darkAccent = preset?.DarkColor ?? baseColor;

        // Radii, fonts, flow direction
        SoftPalette.ApplyCornerRadius(res, theme.CornerRadius);
        res["AppFontFamily"] = SoftPalette.FontFamilyFor(language);
        // Annotate draws its labels in the same fonts (read when a label is first drawn).
        AnnotationFonts.Use(language);
        SoftPalette.ApplyFlowDirection(res, language);

        if (theme.Style == ThemeStyle.MaterialYou)
        {
            var lightPalette = MaterialYouPalette.Generate(lightAccent, isDark: false);
            var darkPalette = MaterialYouPalette.Generate(darkAccent, isDark: true);

            var lightDict = lightPalette.ToResourceDictionary();
            var darkDict = darkPalette.ToResourceDictionary();

            ApplyCustomOverrides(lightDict, custom?.Light);
            ApplyCustomOverrides(darkDict, custom?.Dark);

            res.ThemeDictionaries[ThemeVariant.Light] = lightDict;
            res.ThemeDictionaries[ThemeVariant.Dark] = darkDict;

            // Clear top-level accent keys so controls resolve variant-specific roles from ThemeDictionaries
            SoftPalette.ClearTopLevelAccent(res);
        }
        else
        {
            if (string.Equals(preset?.Key, "monochrome", StringComparison.OrdinalIgnoreCase))
            {
                var lightDict = new ResourceDictionary();
                var darkDict = new ResourceDictionary();
                SoftPalette.ApplyMonochromeAccent(lightDict, isDark: false);
                SoftPalette.ApplyMonochromeAccent(darkDict, isDark: true);
                ApplyCustomOverrides(lightDict, custom?.Light);
                ApplyCustomOverrides(darkDict, custom?.Dark);
                res.ThemeDictionaries[ThemeVariant.Light] = lightDict;
                res.ThemeDictionaries[ThemeVariant.Dark] = darkDict;

                // Clear top-level so dark mode resolves silvery white and light mode resolves charcoal
                SoftPalette.ClearTopLevelAccent(res);
            }
            else if (preset != null)
            {
                var lightDict = new ResourceDictionary();
                var darkDict = new ResourceDictionary();
                SoftPalette.ApplyAccent(lightDict, lightAccent);
                SoftPalette.ApplyAccent(darkDict, darkAccent);
                ApplyCustomOverrides(lightDict, custom?.Light);
                ApplyCustomOverrides(darkDict, custom?.Dark);
                res.ThemeDictionaries[ThemeVariant.Light] = lightDict;
                res.ThemeDictionaries[ThemeVariant.Dark] = darkDict;

                // Clear top-level so light/dark preset pair resolves correctly under System theme
                SoftPalette.ClearTopLevelAccent(res);
            }
            else
            {
                SoftPalette.ApplyAccent(res, baseColor);
                ApplyCustom(res, ThemeVariant.Light, custom?.Light);
                ApplyCustom(res, ThemeVariant.Dark, custom?.Dark);
            }
        }

        var isMaterialYou = theme.Style == ThemeStyle.MaterialYou;
        if (app.ApplicationLifetime is Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop)
        {
            foreach (var window in desktop.Windows)
                window.Classes.Set("material-you", isMaterialYou);
        }

        Motion.Configure(theme.ReduceMotion, () => _platform.PrefersReducedMotion);
    }

    /// <summary>The UI font chain for <paramref name="language"/> (see <see cref="SoftPalette.FontFamilies"/>).</summary>
    internal static string FontFamilies(string language) => SoftPalette.FontFamilies(language);

    private static void ApplyCustomOverrides(IResourceDictionary dictionary, IReadOnlyDictionary<string, string>? colors)
    {
        foreach (var (name, value) in colors ?? new Dictionary<string, string>())
            if (CustomBrushKeys.TryGetValue(name, out var key) && Color.TryParse(value, out var color))
                dictionary[key] = new SolidColorBrush(color);
        // Plain buttons are the surface they sit on (#524): also under Material You and a theme.json's own surface.
        if (dictionary.TryGetValue("SurfaceBrush", out var surface))
            dictionary["ButtonBackground"] = surface;
        if (dictionary.TryGetValue("SurfaceAltBrush", out var surfaceAlt))
            dictionary["ButtonBackgroundPointerOver"] = surfaceAlt;
    }

    /// <summary>Replaces (or, with no colours, removes) the user's colours for one variant.</summary>
    private static void ApplyCustom(IResourceDictionary res, ThemeVariant variant, IReadOnlyDictionary<string, string>? colors)
    {
        var dictionary = new ResourceDictionary();
        ApplyCustomOverrides(dictionary, colors);

        if (dictionary.Count == 0)
            res.ThemeDictionaries.Remove(variant);
        else
            res.ThemeDictionaries[variant] = dictionary;
    }

    /// <summary>Lightens (amount &gt; 0) or darkens (amount &lt; 0) a colour.</summary>
    public static Color Shade(Color c, double amount) => SoftPalette.Shade(c, amount);

    /// <summary>Relative luminance 0..1 (sRGB approximation).</summary>
    public static double Luminance(Color c) => SoftPalette.Luminance(c);
}
