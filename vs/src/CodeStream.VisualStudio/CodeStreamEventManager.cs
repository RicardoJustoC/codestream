﻿using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Services;
using CodeStream.VisualStudio.Vssdk;
using Microsoft.VisualStudio.PlatformUI;
using Serilog;
using System;

namespace CodeStream.VisualStudio
{
    /// <summary>
    /// Attaches CodeStream-specific handlers to VisualStudio events
    /// </summary>
    public class CodeStreamEventManager: IDisposable
    {
        private static readonly ILogger Log = LogManager.ForContext<CodeStreamEventManager>();

        private readonly VsShellEventManager _vsShellEventManager;
        private readonly IBrowserService _browserService;

        public CodeStreamEventManager(VsShellEventManager vsShellEventManager,
	        IBrowserService browserService)
        {
            _vsShellEventManager = vsShellEventManager;
            _browserService = browserService;
            
            _vsShellEventManager.VisualStudioThemeChangedEventHandler += OnThemeChanged;
            _vsShellEventManager.BeforeSolutionClosingEventHandler += BeforeSolutionClosingEventHandler;
        }

        private void BeforeSolutionClosingEventHandler(object sender, EventArgs e)
        {
            Log.Information("Solution is closing");
        }

        private void OnThemeChanged(object sender, ThemeChangedEventArgs e)
        {
            try
            {
                Log.Information(nameof(OnThemeChanged));

                _browserService?.ReloadWebView();
            }
            catch (Exception ex)
            {
                Log.Error(ex, nameof(OnThemeChanged));
            }
        }

        private bool _disposedValue;

        private void Dispose(bool disposing)
        {
            System.Windows.Threading.Dispatcher.CurrentDispatcher.VerifyAccess();

            if (!_disposedValue)
            {
                if (disposing)
                {
                    _vsShellEventManager.VisualStudioThemeChangedEventHandler -= OnThemeChanged;
                    _vsShellEventManager.BeforeSolutionClosingEventHandler -= BeforeSolutionClosingEventHandler;

                    Log.Debug($"Unregistering events");
                }

                _disposedValue = true;
            }
        }

        public void Dispose()
        {
            Dispose(true);
        }
    }
}
