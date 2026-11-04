// Frameless "FORMAT RELAY" Typography Loading Bar (Style 2).
// Each letter starts in warm sand (#C5BAAC). As progress advances, the active letter
// illuminates in Flame Red-Orange (#EA4122), and completed letters lock into Deep Espresso (#1A1915).

using System.Globalization;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace FormatRelay.Setup.Controls;

public sealed class WordmarkProgressBar : Control
{
    public static readonly StyledProperty<double> ValueProperty =
        AvaloniaProperty.Register<WordmarkProgressBar, double>(nameof(Value));

    private static readonly char[] Letters = ['F', 'O', 'R', 'M', 'A', 'T', ' ', 'R', 'E', 'L', 'A', 'Y'];
    private static readonly IBrush CompletedBrush = new SolidColorBrush(Color.Parse("#1A1915"));
    private static readonly IBrush ActiveBrush = new SolidColorBrush(Color.Parse("#EA4122"));
    private static readonly IBrush PendingBrush = new SolidColorBrush(Color.Parse("#C5BAAC"));
    private static readonly Typeface Typeface = new(FontFamily.Default, FontStyle.Normal, FontWeight.Black);

    private readonly FrameLoop _loop;
    private double _shown;

    static WordmarkProgressBar()
    {
        AffectsRender<WordmarkProgressBar>(ValueProperty);
    }

    public WordmarkProgressBar()
    {
        MinHeight = 44;
        MinWidth = 280;
        _loop = new FrameLoop(this, _ =>
        {
            if (Math.Abs(_shown - Value) > 0.1)
            {
                _shown += (Value - _shown) * 0.15;
                InvalidateVisual();
                return true;
            }
            _shown = Value;
            InvalidateVisual();
            return false;
        });
    }

    /// <summary>0 to 100.</summary>
    public double Value
    {
        get => GetValue(ValueProperty);
        set => SetValue(ValueProperty, value);
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        if (change.Property == ValueProperty)
        {
            if (!SetupMotion.Enabled)
                _shown = Value;
            InvalidateVisual();
            _loop.Kick();
        }
    }

    public override void Render(DrawingContext context)
    {
        var bounds = Bounds;
        var progress = Math.Clamp(SetupMotion.Enabled ? _shown : Value, 0, 100);

        const double fontSize = 26;
        var typeface = Typeface;

        // Measure all glyphs to center them
        var texts = new FormattedText?[Letters.Length];
        double totalWidth = 0;
        const double letterSpacing = 6;
        const double wordGap = 16;

        int letterIndex = 0;
        for (int i = 0; i < Letters.Length; i++)
        {
            char ch = Letters[i];
            if (ch == ' ')
            {
                texts[i] = null;
                totalWidth += wordGap;
                continue;
            }

            double threshold = (letterIndex + 1) * (100.0 / 11.0);
            IBrush brush;

            if (progress >= threshold)
            {
                brush = CompletedBrush;
            }
            else if (progress >= threshold - (100.0 / 11.0))
            {
                brush = ActiveBrush;
            }
            else
            {
                brush = PendingBrush;
            }

            var ft = new FormattedText(
                ch.ToString(),
                CultureInfo.InvariantCulture,
                FlowDirection.LeftToRight,
                typeface,
                fontSize,
                brush);

            texts[i] = ft;
            totalWidth += ft.Width + letterSpacing;
            letterIndex++;
        }
        totalWidth -= letterSpacing;

        double startX = Math.Max(0, (bounds.Width - totalWidth) / 2);
        double centerY = bounds.Height / 2;

        double curX = startX;
        letterIndex = 0;
        for (int i = 0; i < Letters.Length; i++)
        {
            char ch = Letters[i];
            if (ch == ' ')
            {
                curX += wordGap;
                continue;
            }

            var ft = texts[i];
            if (ft is not null)
            {
                double threshold = (letterIndex + 1) * (100.0 / 11.0);
                double yOffset = (progress < threshold && progress >= threshold - (100.0 / 11.0)) ? -2 : 0;
                context.DrawText(ft, new Point(curX, centerY - ft.Height / 2 + yOffset));
                curX += ft.Width + letterSpacing;
            }
            letterIndex++;
        }
    }
}
