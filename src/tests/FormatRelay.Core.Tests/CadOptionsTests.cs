// The colours a CAD drawing is drawn in (#411) are a preset option: saved by name, as drawn when missing or unknown.

using System.Text.Json;
using FormatRelay.Core.Presets;
using FormatRelay.Core.Settings;

namespace FormatRelay.Core.Tests;

public class CadOptionsTests
{
    [Fact]
    public void Cad_colours_are_saved_by_name_and_read_leniently()
    {
        var preset = new Preset { TargetFormat = "pdf", Cad = { Colors = CadColors.BlackAndWhite } };

        var json = JsonSerializer.Serialize(preset, FormatRelayJsonContext.Default.Preset);

        Assert.Contains("\"colors\": \"BlackAndWhite\"", json);
        Assert.Equal(CadColors.BlackAndWhite, JsonSerializer.Deserialize(json, FormatRelayJsonContext.Default.Preset)!.Cad.Colors);
        var copy = preset.Clone();
        copy.Cad.Colors = CadColors.Grayscale;
        Assert.Equal(CadColors.BlackAndWhite, preset.Cad.Colors); // the copy has its own options

        // A preset saved before the option draws as drawn; so does a choice from a newer FormatRelay.
        var old = JsonSerializer.Deserialize("""{"targetFormat":"pdf","cad":{"version":"AutoCad2013"}}""", FormatRelayJsonContext.Default.Preset)!;
        var newer = JsonSerializer.Deserialize("""{"targetFormat":"pdf","cad":{"version":"AutoCad2013","colors":"Sepia"}}""", FormatRelayJsonContext.Default.Preset)!;
        Assert.Equal((CadVersion.AutoCad2013, CadColors.AsDrawn), (old.Cad.Version, old.Cad.Colors));
        Assert.Equal((CadVersion.AutoCad2013, CadColors.AsDrawn), (newer.Cad.Version, newer.Cad.Colors));
    }
}
