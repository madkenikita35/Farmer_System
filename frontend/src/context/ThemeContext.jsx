// context/ThemeContext.jsx
// -----------------------------------------------------------------------
// Holds the one theme choice and writes it onto <html>.
//
//   accent : "green" | "earth"   - which colour the app uses
//
// ---------------------------------------------------------------------
// HOW LITTLE THIS FILE ACTUALLY DOES
// ---------------------------------------------------------------------
// All it does is set one attribute:
//
//     <html data-accent="earth">
//
// src/styles/tokens.css matches on that attribute and swaps the values
// of the primary colour variables. The browser then repaints the whole
// app itself. No component re-renders because of a theme change, no
// colours are passed down as props, and no page needs to know a theme
// exists.
//
// That is the payoff of keeping colours in CSS variables. If they had
// stayed as hex codes in tailwind.config.js, this file would have to
// repaint every component by hand.
//
// ---------------------------------------------------------------------
// WHAT GOES IN localStorage
// ---------------------------------------------------------------------
// Only one word, next to `mandi_language`. It is a preference with
// nothing private in it. Tokens, names, phone numbers and roles never
// go in localStorage - see context/AuthContext.jsx for why.
// -----------------------------------------------------------------------

import { createContext, useContext, useState, useEffect } from "react";

const ACCENT_KEY = "mandi_theme_accent";

export const ACCENTS = ["green", "earth"];

const ThemeContext = createContext(null);

// Reading localStorage can throw in private-browsing mode or when site
// data is blocked, and an unreadable preference is never worth crashing
// the app over - so the read falls back to the default.
function readAccent() {
  try {
    const value = localStorage.getItem(ACCENT_KEY);
    return ACCENTS.includes(value) ? value : "green";
  } catch {
    return "green";
  }
}

export function ThemeProvider({ children }) {
  const [accent, setAccentState] = useState(readAccent);

  // ---- Push the choice onto <html>, which is all a theme change is ----
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  // ---- Remember it ----
  useEffect(() => {
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch {
      // Not remembering is a small loss; crashing is not.
    }
  }, [accent]);

  // Guarded so a typo cannot put the app into a theme that has no
  // matching block in tokens.css - the page would lose its colours.
  function setAccent(next) {
    if (ACCENTS.includes(next)) setAccentState(next);
  }

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme() must be used inside <ThemeProvider>");
  }
  return context;
}
