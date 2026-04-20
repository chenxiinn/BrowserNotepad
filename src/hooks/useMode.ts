import { useState, useEffect } from 'react';

export type AppMode = 'sidePanel' | 'floating';

function isChromeExtension(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

export function useMode(): { mode: AppMode; isFloating: boolean; isSidePanel: boolean } {
  const [mode, setMode] = useState<AppMode>('sidePanel');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'floating') {
      setMode('floating');
      return;
    }
    if (isChromeExtension() && chrome.windows) {
      chrome.windows.getCurrent((win) => {
        if (win && win.type === 'popup') {
          setMode('floating');
        }
      });
    }
  }, []);

  return {
    mode,
    isFloating: mode === 'floating',
    isSidePanel: mode === 'sidePanel',
  };
}