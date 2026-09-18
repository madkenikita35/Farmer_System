// context/ThemeContext.jsx
// -----------------------------------------------------------------------
// Holds the two theme choices and writes them onto <html>.
//
//   accent : "green" | "blue" | "earth"   - which colour the app uses
//   mode   : "light" | "dark"             - light or dark background
//
// They are INDEPENDENT. Someone can have the blue theme in dark mode, or
// earth in light. Combining them into one list of six "themes" would
// mean six names to invent and six things to keep in step, for no gain.
//
// ---------------------------------------------------------------------
// HOW LITTLE THIS FILE ACTUALLY DOES
// ---------------------------------------------------------------------
// All it does is set two attributes:
//
//     <html data-accent="blue" data-mode="dark">
//
// src/styles/tokens.css matches on those attributes and swaps the values
// of every colour variable. The browser then repaints the whole app
// itself. No component re-renders because of a theme change, no colours
// are passed down as props, and no page needs to know a theme exists.
//
// That is the entire payoff of stage 1. If the colours had stayed as hex
// codes in tailwind.config.js, this file would have to repaint every
// component by hand.
//
// ---------------------------------------------------------------------
// WHAT GOES IN localStorage
// ---------------------------------------------------------------------
// Only these two words, next to `mandi_language`. They are preferences
// with nothing private in them. Tokens, names, phone numbers and roles
// never go in localStorage - see context/AuthContext.jsx for why.
// -----------------------------------------------------------------------

import { createContext, useContext, useState, useEffect } from "react";

const ACCENT_KEY = "mandi_theme_accent";
const MODE_KEY = "mandi_theme_mode";

export const ACCENTS = ["green", "blue", "earth"];
export const MODES = ["light", "dark"];

const ThemeContext = createContext(null);

// Reading localStorage can throw in private-browsing mode or when site
// data is blocked, and an unreadable preference is never worth crashing
// the app over - so every read falls back to a sensible default.
function readStored(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

// If nothing has been chosen yet, follow whatever the phone or laptop is
// already set to. Someone who runs their device in dark mode has said
// what they want; asking them again is just an extra step.
function preferredMode() {
  try {
    if (localStorage.getItem(MODE_KEY)) {
      return readStored(MODE_KEY, MODES, "light");
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    // no matchMedia, or storage blocked
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [accent, setAccentState] = useState(() =>
    readStored(ACCENT_KEY, ACCENTS, "green")
  );
  const [mode, setModeState] = useState(preferredMode);

  // ---- Push the choice onto <html>, which is all a theme change is ----
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    document.documentElement.setAttribute("data-mode", mode);
  }, [accent, mode]);

  // ---- Remember it ----
  useEffect(() => {
    try {
      localStorage.setItem(ACCENT_KEY, accent);
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // Not remembering is a small loss; crashing is not.
    }
  }, [accent, mode]);

  // Guarded so a typo cannot put the app into a theme that has no
  // matching block in tokens.css - the page would lose every colour.
  function setAccent(next) {
    if (ACCENTS.includes(next)) setAccentState(next);
  }

  function setMode(next) {
    if (MODES.includes(next)) setModeState(next);
  }

  function toggleMode() {
    setModeState((current) => (current === "dark" ? "light" : "dark"));
  }

  const value = {
    accent,
    mode,
    isDark: mode === "dark",
    setAccent,
    setMode,
    toggleMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme() must be used inside <ThemeProvider>");
  }
  return context;
}
