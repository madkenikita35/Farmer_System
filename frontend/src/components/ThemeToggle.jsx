// components/ThemeToggle.jsx
// -----------------------------------------------------------------------
// Two controls in the top bar:
//
//   1. A sun/moon button - one tap, light or dark. This is the one
//      people actually use, so it is always visible and needs no menu.
//
//   2. A small palette menu for the accent colour. Hidden behind a
//      button because it is a once-ever choice: nobody changes their
//      brand colour daily, and three permanent swatches in the top bar
//      would be exactly the clutter this redesign is removing.
//
// The colour choice is shown as SWATCHES rather than the words "Green /
// Blue / Earth". A farmer picking a colour is choosing what they can
// see, and a swatch says it in every one of the eleven languages at
// once. The words are still there for screen readers.
// -----------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";

import { useLanguage } from "../context/LanguageContext";
import { useTheme, ACCENTS } from "../context/ThemeContext";

// The dot shown for each choice. These are literal colours on purpose:
// a swatch has to show what you would be switching TO, so it cannot use
// the variable that only holds the accent you are already on.
const SWATCHES = {
  green: "#12814A",
  blue: "#2563EB",
  earth: "#9C5A31",
};

const LABEL_KEYS = {
  green: "theme_green",
  blue: "theme_blue",
  earth: "theme_earth",
};

function ThemeToggle() {
  const { t } = useLanguage();
  const { accent, setAccent, isDark, toggleMode } = useTheme();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef(null);

  // ---- Close the palette on Escape or a click elsewhere ----
  // A small menu that will not go away is more annoying than one that
  // takes two taps to open.
  useEffect(() => {
    if (!isPaletteOpen) return;

    function handleKey(event) {
      if (event.key === "Escape") setIsPaletteOpen(false);
    }
    function handleClick(event) {
      if (paletteRef.current && !paletteRef.current.contains(event.target)) {
        setIsPaletteOpen(false);
      }
    }

    window.addEventListener("keydown", handleKey);
    // `true` listens on the way DOWN the tree, so this still fires even
    // if something inside the page stops the click from bubbling.
    document.addEventListener("mousedown", handleClick, true);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick, true);
    };
  }, [isPaletteOpen]);

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* ---------- Light / dark ---------- */}
      <button
        type="button"
        onClick={toggleMode}
        // The label names where you are GOING, not where you are - that
        // is what a button press does, and it is what a screen reader
        // user needs to hear.
        aria-label={isDark ? t("theme_light") : t("theme_dark")}
        title={isDark ? t("theme_light") : t("theme_dark")}
        className="grid place-items-center w-9 h-9 rounded-xl text-base
          text-ink-600 hover:bg-surface-200 transition-colors"
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* ---------- Accent colour ---------- */}
      <div className="relative" ref={paletteRef}>
        <button
          type="button"
          onClick={() => setIsPaletteOpen((open) => !open)}
          aria-label={t("theme_colour")}
          title={t("theme_colour")}
          aria-expanded={isPaletteOpen}
          aria-haspopup="true"
          className="grid place-items-center w-9 h-9 rounded-xl
            hover:bg-surface-200 transition-colors"
        >
          {/* The button itself shows the current colour, so the menu
              does not have to be opened just to check. */}
          <span
            className="w-4 h-4 rounded-full ring-2 ring-card shadow-soft"
            style={{ backgroundColor: SWATCHES[accent] }}
          />
        </button>

        {isPaletteOpen && (
          <div
            className="absolute right-0 top-full mt-2 z-50 bg-card rounded-2xl
              shadow-lifted border border-surface-300 p-2 animate-fadeInDown"
          >
            <p className="px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
              {t("theme_colour")}
            </p>

            <div className="flex gap-1.5 px-1 pb-1">
              {ACCENTS.map((name) => {
                const isActive = name === accent;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setAccent(name);
                      setIsPaletteOpen(false);
                    }}
                    aria-label={t(LABEL_KEYS[name])}
                    title={t(LABEL_KEYS[name])}
                    // aria-pressed is what tells a screen reader which
                    // one is currently on - the ring around it is only
                    // visible information.
                    aria-pressed={isActive}
                    className={`grid place-items-center w-10 h-10 rounded-xl transition-all
                      ${isActive ? "bg-surface-200 scale-105" : "hover:bg-surface-100"}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full transition-all
                        ${isActive ? "ring-2 ring-offset-2 ring-offset-card ring-ink-400" : ""}`}
                      style={{ backgroundColor: SWATCHES[name] }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThemeToggle;
