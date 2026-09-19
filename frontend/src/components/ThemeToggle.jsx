// components/ThemeToggle.jsx
// -----------------------------------------------------------------------
// Picks the app's accent colour: green or earth.
//
// It lives behind a small button rather than showing both swatches in
// the top bar, because this is a once-ever choice. Nobody changes their
// brand colour daily, and two permanent swatches up there would be
// exactly the clutter this redesign was removing.
//
// The choice is shown as SWATCHES rather than the words "Green" and
// "Earth". Someone picking a colour is choosing what they can see, and
// a swatch says it in every one of the eleven languages at once. The
// words are still there for screen readers, via aria-label.
// -----------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";

import { useLanguage } from "../context/LanguageContext";
import { useTheme, ACCENTS } from "../context/ThemeContext";

// The dot shown for each choice. These are literal colours on purpose:
// a swatch has to show what you would be switching TO, so it cannot use
// the variable that only ever holds the accent you are already on.
const SWATCHES = {
  green: "#12814A",
  earth: "#9C5A31",
};

const LABEL_KEYS = {
  green: "theme_green",
  earth: "theme_earth",
};

function ThemeToggle() {
  const { t } = useLanguage();
  const { accent, setAccent } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const paletteRef = useRef(null);

  // ---- Close on Escape or a click elsewhere ----
  // A small menu that will not go away is more annoying than one that
  // takes two taps to open.
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    function handleClick(event) {
      if (paletteRef.current && !paletteRef.current.contains(event.target)) {
        setIsOpen(false);
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
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={paletteRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t("theme_colour")}
        title={t("theme_colour")}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="grid place-items-center w-9 h-9 rounded-md
          hover:bg-surface-200 transition-colors"
      >
        {/* The button itself shows the current colour, so the menu does
            not have to be opened just to check which one is on. */}
        <span
          className="w-4 h-4 rounded-full ring-2 ring-card shadow-soft"
          style={{ backgroundColor: SWATCHES[accent] }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 z-50 bg-card rounded-lg
            shadow-lifted border border-surface-300 p-2 animate-fadeInDown"
        >
          <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
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
                    setIsOpen(false);
                  }}
                  aria-label={t(LABEL_KEYS[name])}
                  title={t(LABEL_KEYS[name])}
                  // aria-pressed is what tells a screen reader which one
                  // is currently on - the ring around it is visible
                  // information only.
                  aria-pressed={isActive}
                  className={`grid place-items-center w-10 h-10 rounded-md transition-all
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
  );
}

export default ThemeToggle;
