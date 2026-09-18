/** @type {import('tailwindcss').Config} */

// tailwind.config.js
// -----------------------------------------------------------------------
// THE APP'S COLOUR SYSTEM.
//
// The actual colours are NOT in this file any more. They live in
// src/styles/tokens.css as CSS variables, and this file only says which
// variable each Tailwind class should read.
//
// WHY THE COLOURS MOVED OUT
// A hex code written here is baked into the stylesheet at build time, so
// it can never change while the app is running. That makes a theme
// toggle impossible - you would have to ship a whole second stylesheet
// and swap it, or repaint every component from JavaScript. Pointing at a
// variable instead means switching theme is one attribute on <html> and
// the browser repaints everything itself.
//
// So the shade scales work exactly as before:
//
//     bg-primary-50     a barely-there tint, good for panel backgrounds
//     text-primary-700  strong enough to read as body text
//     bg-primary-600    the main button colour
//     hover:bg-primary-hover   its hover state
//
// HOW TO PICK A SHADE (the rule of thumb, unchanged):
//     50-100   page and panel backgrounds
//     200-300  borders and dividers
//     400-500  icons, accents, decorative fills
//     600-700  buttons and links
//     800-950  headings and body text
//
// WHAT `<alpha-value>` IS DOING
// Tailwind substitutes the opacity into that slot, so bg-primary-600/50
// still works. It only works if the variable holds SEPARATE channels
// ("18 129 74") rather than a hex string - which is why tokens.css looks
// the way it does.
// -----------------------------------------------------------------------

// Reads one CSS variable, in the form Tailwind needs for opacity support.
function token(name) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

// Builds a whole shade scale from a variable prefix, so the 50-950 list
// is written once instead of seven times.
function scale(prefix, steps) {
  const result = {};
  for (const step of steps) {
    result[step] = token(`${prefix}-${step}`);
  }
  return result;
}

const FULL_SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SURFACE_SCALE = [50, 100, 200, 300, 400];
const VERDICT_SCALE = [50, 100, 500, 600, 700]; // fair / under / over

export default {
  // Tailwind scans these files to figure out which CSS classes to generate.
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ---- PRIMARY: the accent colour, whichever theme is on. -----
        // Green by default; earth swaps the same variables.
        primary: {
          ...scale("primary", FULL_SCALE),
          DEFAULT: token("primary-600"),
          // What sits ON a primary button. White today - but named for
          // the JOB it does, so buttons say text-primary-foreground and
          // not text-white, and a palette change is one token away
          // instead of a hunt through every button in the app.
          foreground: token("primary-foreground"),
          // The hover shade. It gets its own token rather than a shade
          // number because each accent darkens by a different amount -
          // hover:bg-primary-700 is too subtle on earth, too heavy on
          // green.
          hover: token("primary-hover"),
        },

        // ---- ACCENT: harvest amber. Warmth, grain, attention. ------
        // Used sparingly - for the ONE thing on a screen that matters
        // most. An accent used everywhere stops being an accent.
        accent: scale("accent", FULL_SCALE),

        // ---- INK: deep slate blue. Headings and body text. ---------
        // Reads as "black" but carries a hint of blue, which is softer
        // than pure black on a warm paper background.
        ink: scale("ink", FULL_SCALE),

        // ---- SURFACE: warm paper. Page and card backgrounds. -------
        // A slightly warm off-white rather than pure white, so the
        // screen feels closer to paper than to a spreadsheet.
        surface: scale("surface", SURFACE_SCALE),

        // ---- SEMANTIC: the three verdicts the app keeps showing -----
        // Naming these by MEANING rather than colour means a "Fair
        // Price" badge is written as bg-fair-100, which says what it is.
        fair: scale("fair", VERDICT_SCALE),
        under: scale("under", VERDICT_SCALE),
        over: scale("over", VERDICT_SCALE),

        // ---- ROLE COLOURS ------------------------------------------
        // Named for the job they do rather than the shade they pick, so
        // they survive a theme change. Prefer these in new code:
        //   bg-card        a raised panel   (was bg-white)
        //   bg-muted       a recessed strip (was bg-gray-50)
        //   border-border  any divider      (was border-gray-200)
        background: token("background"),
        foreground: token("foreground"),
        card: {
          DEFAULT: token("card"),
          foreground: token("card-foreground"),
        },
        muted: {
          DEFAULT: token("muted"),
          foreground: token("muted-foreground"),
        },
        border: token("border"),
        input: token("input"),
        ring: token("ring"),

        // A dark slate panel - the secondary button and the footer.
        // It has its own tokens rather than borrowing ink-900, because
        // "a dark panel" is a ROLE: the day the text scale is retuned,
        // the footer should not change with it.
        secondary: {
          DEFAULT: token("secondary"),
          strong: token("secondary-strong"),
          foreground: token("secondary-foreground"),
        },

        // ---- ROLE RAMPS --------------------------------------------
        // These replaced the raw red/green/amber/sky classes that were
        // scattered through the pages. Same shade numbers, so the swap
        // was one-for-one:
        //
        //     bg-red-50      ->  bg-negative-50
        //     text-green-700 ->  text-positive-700
        //     border-amber-200 -> border-warning-200
        //     bg-sky-50      ->  bg-info-50
        //
        // The values ARE Tailwind's own red/green/amber/sky, so the
        // swap changed nothing visible - it just gave those colours
        // names that say what they mean.
        //
        // They deliberately do NOT follow the accent: an error stays
        // red when someone picks the earth theme.
        positive: scale("positive", FULL_SCALE),
        negative: scale("negative", FULL_SCALE),
        warning: scale("warning", FULL_SCALE),
        info: scale("info", FULL_SCALE),

        // ---- LEGACY ALIASES ----------------------------------------
        // Kept so the remaining `brand-*` classes keep working. They now
        // point at tokens, so they follow the theme like everything
        // else. Prefer the scales above in new code.
        brand: {
          green: token("primary-600"),
          darkgreen: token("primary-700"),
          cream: token("surface-100"),
          navy: token("ink-900"),
        },
      },

      // Softer, warmer shadows than Tailwind's default grey ones, so
      // cards feel lifted off the paper rather than cut out of it.
      //
      // --shadow-strength is a multiplier, not a colour. It is the one
      // dial that makes every shadow heavier or lighter at once, rather
      // than retuning all three of these by hand.
      boxShadow: {
        soft: [
          "0 2px 8px -2px rgb(var(--shadow-color) / calc(0.08 * var(--shadow-strength)))",
          "0 4px 16px -4px rgb(var(--shadow-color) / calc(0.06 * var(--shadow-strength)))",
        ].join(", "),
        lifted:
          "0 12px 28px -12px rgb(var(--shadow-color) / calc(0.25 * var(--shadow-strength)))",
        glow: "0 0 0 3px rgb(var(--ring) / 0.15)",
      },

      // A couple of ready-made gradients, so the same one isn't written
      // slightly differently in five places. No <alpha-value> here -
      // gradients are not opacity utilities, so they read the variables
      // directly.
      backgroundImage: {
        "primary-gradient":
          "linear-gradient(135deg, rgb(var(--primary-600)) 0%, rgb(var(--primary-700)) 100%)",
        // Was "ink-gradient". Renamed because it is a dark panel in both
        // modes, and the ink scale no longer means "dark" once the theme
        // flips.
        "secondary-gradient":
          "linear-gradient(135deg, rgb(var(--secondary)) 0%, rgb(var(--secondary-strong)) 100%)",
        "accent-gradient":
          "linear-gradient(135deg, rgb(var(--accent-400)) 0%, rgb(var(--accent-600)) 100%)",
        "page-gradient":
          "linear-gradient(180deg, rgb(var(--surface-50)) 0%, rgb(var(--surface-100)) 40%, rgb(var(--surface-200)) 100%)",
      },

      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
