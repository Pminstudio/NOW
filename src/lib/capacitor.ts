import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

/**
 * Initialize Capacitor plugins for native functionality
 * Call this once when the app starts
 */
export async function initializeCapacitor(): Promise<void> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Hide splash screen after app is ready
  await SplashScreen.hide();

  // Configure status bar
  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#1e1033' });

  // Setup keyboard listeners
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    document.body.style.setProperty('--keyboard-height', '0px');
  });

  // Handle app URL open (deep linking)
  App.addListener('appUrlOpen', (event) => {
    // Handle deep links here
    // Example: now://pulse/123 -> navigate to pulse 123
    const url = new URL(event.url);
    console.log('Deep link opened:', url.pathname);
  });

  // Handle back button (Android)
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  });
}

/**
 * Check if running on a native platform
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
