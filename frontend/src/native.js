// src/native.js
// -----------------------------------------------------------------------
// Everything that only applies when the app is running as an installed
// Android/iOS app rather than in a browser.
//
// ---------------------------------------------------------------------
// THE RULE THIS FILE FOLLOWS
// ---------------------------------------------------------------------
// The website and the app are the SAME build. So every function here
// checks isNative() first and returns quietly on the web - nothing in
// this file may change how the site behaves in a browser.
//
// That is also why the Capacitor plugins are imported lazily, inside the
// functions. A top-level `import { StatusBar } from "@capacitor/status-bar"`
// would pull the plugin into the website's bundle for no reason, and
// every visitor would download code that can never run.
// -----------------------------------------------------------------------

import { Capacitor } from "@capacitor/core";

/**
 * True only inside the installed app.
 *
 * Capacitor's own check, not a user-agent sniff: a phone browser is NOT
 * a native platform, and should keep getting the website exactly as it
 * is today.
 */
export function isNative() {
  return Capacitor.isNativePlatform();
}

/** "android" | "ios" | "web" - for the rare thing that differs between them. */
export function platform() {
  return Capacitor.getPlatform();
}

// The brand green. Hardcoded rather than read from the CSS tokens
// because the status bar is painted by ANDROID, not by the web view -
// it is outside the page, so var(--primary-600) means nothing to it.
//
// If the palette changes, this changes with it. That is the one place
// the two have to be kept in step by hand.
const BRAND = "#3A6B50";

/**
 * Colours the strip at the top of the screen where the clock and
 * battery live.
 *
 * Without this the status bar stays the system default - usually white
 * with dark icons - so the app opens with a bright band above a green
 * header, which is the single most obvious "this is a web page in a
 * box" tell.
 */
async function themeStatusBar() {
  const { StatusBar, Style } = await import("@capacitor/status-bar");

  try {
    await StatusBar.setBackgroundColor({ color: BRAND });

    // Style.Light means LIGHT CONTENT - white icons - which is what a
    // dark green bar needs. The naming trips everyone up: it describes
    // the icons, not the background.
    await StatusBar.setStyle({ style: Style.Light });

    // Keep the web view below the status bar rather than drawing under
    // it. Overlay mode looks good only if every screen is built for it;
    // ours are not, and the header would slide under the clock.
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    // Not fatal. A wrongly-coloured status bar is a blemish; a crash on
    // launch is not. iOS in particular rejects setBackgroundColor.
    console.warn("Could not theme the status bar:", error.message);
  }
}

/**
 * Hides the launch image once the app has actually drawn something.
 *
 * capacitor.config.json sets launchAutoHide:false, so the splash stays
 * up until this runs. That is deliberate: a fixed timer is either too
 * short - the splash vanishes and the user watches a white page while
 * React boots - or too long, and they wait for nothing.
 */
async function hideSplash() {
  const { SplashScreen } = await import("@capacitor/splash-screen");

  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch (error) {
    console.warn("Could not hide the splash screen:", error.message);
  }
}

/**
 * Call once, as early as possible.
 *
 * Returns immediately on the web, so main.jsx can call it
 * unconditionally.
 */
export async function initNative() {
  if (!isNative()) return;

  // Marks the <html> element so CSS can target the app specifically -
  // safe-area padding, the bottom tab bar, no overscroll bounce. Doing
  // it with an attribute rather than a class keeps it next to
  // data-accent, which works the same way.
  document.documentElement.setAttribute("data-native", platform());

  await themeStatusBar();

  // Hide the splash on the next frame, after React's first paint. The
  // double rAF is the reliable way to say "after the browser has
  // actually rendered", not merely "after the render call returned".
  requestAnimationFrame(() => requestAnimationFrame(hideSplash));
}
