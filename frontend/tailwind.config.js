/** @type {import('tailwindcss').Config} */

// tailwind.config.js
// -----------------------------------------------------------------------
// THE APP'S COLOUR SYSTEM.
//
// It used to be four flat colours - one green, one dark green, one cream,
// one navy. That works until you need a hover state, a soft background, a
// border, or a muted label. Then you're reaching for Tailwind's generic
// grays and greens, and the app slowly stops looking like one thing.
//
// So each colour is now a full SHADE SCALE from 50 (almost white) to 950
// (almost black), the same way Tailwind's own colours work:
//
//     bg-primary-50     a barely-there tint, good for panel backgrounds
//     text-primary-700  strong enough to read as body text
//     bg-primary-600    the main button colour
//     hover:bg-primary-700   its hover state - one step darker, always
//
// HOW TO PICK A SHADE (the rule of thumb):
//     50-100   page and panel backgrounds
//     200-300  borders and dividers
//     400-500  icons, accents, decorative fills
//     600-700  buttons and links (600 normal, 700 hover)
//     800-950  headings and body text
//
// THE OLD NAMES STILL WORK. `brand-green`, `brand-navy`, `brand-cream`
// and `brand-darkgreen` are kept at the bottom as aliases pointing into
// the new scales - about 130 places in the app use them, and repainting
// them all by hand would have been 130 chances to miss one. They now
// resolve to the new colours automatically.
// -----------------------------------------------------------------------

export default {
  // Tailwind scans these files to figure out which CSS classes to generate.
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ---- PRIMARY: leaf green. Growth, crops, "go". -------------
        // The main identity colour. Buttons, links, active states.
        primary: {
          50: "#EDFBF1",
          100: "#D3F5DD",
          200: "#A9EABE",
          300: "#72D898",
          400: "#3FBF74",
          500: "#1FA25B",
          600: "#12814A", // the main brand green
          700: "#10673D",
          800: "#115233",
          900: "#0F442C",
          950: "#052617",
        },

        // ---- ACCENT: harvest amber. Warmth, grain, attention. ------
        // Used sparingly - for the ONE thing on a screen that matters
        // most. An accent used everywhere stops being an accent.
        accent: {
          50: "#FFF8EC",
          100: "#FFEECB",
          200: "#FFDA92",
          300: "#FFC259",
          400: "#FFAA2B",
          500: "#F98A07",
          600: "#DD6502",
          700: "#B74606",
          800: "#94360C",
          900: "#7A2E0E",
          950: "#451703",
        },

        // ---- INK: deep slate blue. Headings and body text. ---------
        // Pure black text on a warm background looks harsh. This reads
        // as "black" but carries a hint of the brand's blue.
        ink: {
          50: "#F5F7FA",
          100: "#EAEFF5",
          200: "#D0DCE9",
          300: "#A9BFD5",
          400: "#7B9CBB",
          500: "#587DA2",
          600: "#436489",
          700: "#37526F",
          800: "#30455C",
          900: "#1E3A56", // the old "navy"
          950: "#12253A",
        },

        // ---- SURFACE: warm paper. Page and card backgrounds. -------
        // A slightly warm off-white rather than pure white, so the
        // screen feels closer to paper than to a spreadsheet.
        surface: {
          50: "#FFFDF8",
          100: "#FCF9F2", // the page background
          200: "#F4EFE3",
          300: "#E8E0CE",
          400: "#D8CDB3",
        },

        // ---- SEMANTIC: the three verdicts the app keeps showing -----
        // Naming these by MEANING rather than colour means a "Fair
        // Price" badge is written as bg-fair-100, which says what it is.
        // If the colours ever change, the meaning doesn't.
        fair: {
          50: "#EDFBF1",
          100: "#D3F5DD",
          500: "#1FA25B",
          600: "#12814A",
          700: "#10673D",
        },
        under: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        over: {
          50: "#FFF8EC",
          100: "#FFEECB",
          500: "#F98A07",
          600: "#DD6502",
          700: "#B74606",
        },

        // ---- LEGACY ALIASES ----------------------------------------
        // Kept so the ~130 existing `brand-*` classes keep working, now
        // pointing at the new palette. Prefer the scales above in new
        // code - these exist to avoid a risky 21-file find-and-replace.
        brand: {
          green: "#12814A", // -> primary-600
          darkgreen: "#10673D", // -> primary-700
          cream: "#FCF9F2", // -> surface-100
          navy: "#1E3A56", // -> ink-900
        },
      },

      // Softer, warmer shadows than Tailwind's default grey ones, so
      // cards feel lifted off the paper rather than cut out of it.
      boxShadow: {
        soft: "0 2px 8px -2px rgba(30, 58, 86, 0.08), 0 4px 16px -4px rgba(30, 58, 86, 0.06)",
        lifted: "0 12px 28px -12px rgba(30, 58, 86, 0.25)",
        glow: "0 0 0 3px rgba(18, 129, 74, 0.15)",
      },

      // A couple of ready-made gradients, so the same one isn't written
      // slightly differently in five places.
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #12814A 0%, #10673D 100%)",
        "ink-gradient": "linear-gradient(135deg, #1E3A56 0%, #12253A 100%)",
        "accent-gradient": "linear-gradient(135deg, #FFAA2B 0%, #DD6502 100%)",
        "page-gradient": "linear-gradient(180deg, #FFFDF8 0%, #FCF9F2 40%, #F4EFE3 100%)",
      },

      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
