using Avalonia.Controls;
using Avalonia.Interactivity;
using FormatRelay.App.Services;
using FormatRelay.App.ViewModels.Pages;
using FormatRelay.Core.Localization;

namespace FormatRelay.App.Views.Pages;

public partial class AboutPage : UserControl
{
    /// <summary>Below this width (DIPs) the information and update cards are stacked instead of side by side.</summary>
    internal const double StackBelowWidth = 760;

    public AboutPage()
    {
        InitializeComponent();
        InfoUpdateGrid.SizeChanged += (_, e) => InfoUpdateGrid.Classes.Set("stacked", e.NewSize.Width < StackBelowWidth);
    }

    private async void OnOpenRepository(object? sender, RoutedEventArgs e)
    {
        if (DataContext is AboutPageViewModel vm && TopLevel.GetTopLevel(this) is { } top)
            await top.Launcher.LaunchUriAsync(new Uri(vm.RepositoryUrl));
    }

    // A star is given on the repository page itself.
    private void OnStar(object? sender, RoutedEventArgs e) => OnOpenRepository(sender, e);



    private async void OnIssue(object? sender, RoutedEventArgs e)
    {
        if (TopLevel.GetTopLevel(this) is { } top)
            await top.Launcher.LaunchUriAsync(new Uri(Services.UpdateService.NewIssueUrl));
    }
}
