// components/chartTheme.js
// -----------------------------------------------------------------------
// Shared look-and-feel for every chart in the app, so they all read as
// one family rather than eight unrelated pictures.
//
// WHY A SEPARATE FILE
// Both chart components need the same category colours, and the colours
// mean something - green IS vegetables, everywhere. Defining them twice
// is how they drift apart, and a farmer who learns "green = vegetables"
// on one page should not have to relearn it on the next.
//
// WHY THERE ARE FUNCTIONS HERE NOW, NOT JUST CONSTANTS
// Recharts draws to SVG and needs a REAL colour - "#64748b" or
// "rgb(88 125 162)". You cannot hand it "var(--ink-500)"; it does not
// resolve CSS variables, and the chart silently renders black. So the
// theme colours have to be read out of the stylesheet in JavaScript, at
// the moment the chart renders, which is what readToken() below does.
//
// This is the one place in the app where the theme has to be read
// rather than simply applied - everything else is plain CSS and the
// browser handles it.
// -----------------------------------------------------------------------

/**
 * Reads one design token and returns a colour Recharts can use.
 *
 * tokens.css stores colours as separate channels ("88 125 162") so that
 * Tailwind's opacity utilities work, so this wraps them back into
 * rgb(...) before handing them over.
 *
 * `fallback` matters: during the very first render, or in a test
 * environment with no real stylesheet, the variable may not be readable
 * yet. Returning a sensible colour is much better than returning ""
 * and having Recharts quietly draw black on black.
 */
export function readToken(name, fallback) {
  if (typeof document === "undefined") return fallback;

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();

  return raw ? `rgb(${raw})` : fallback;
}

// One colour per crop category. Chosen to be distinguishable from each
// other AND to feel like the thing they describe: leafy green for
// vegetables, ripe red for fruit, grain-gold for cereals.
//
// These deliberately do NOT follow the accent. If someone picks the
// earth theme, fruit must stay red - the colour is carrying meaning,
// and meaning should not change because of a preference.
export const CATEGORY_COLOURS = {
  vegetables: "#2E7D32",
  fruits: "#E53935",
  cereals: "#F9A825",
  pulses: "#EF6C00",
  oilseeds: "#AFB42B",
  spices: "#8E24AA",
  flowers: "#D81B60",
  other: "#546E7A",
};

// The category key -> its translation key, so headings and legends
// appear in the farmer's language.
export const CATEGORY_LABEL_KEYS = {
  vegetables: "cat_vegetables",
  fruits: "cat_fruits",
  cereals: "cat_cereals",
  pulses: "cat_pulses",
  oilseeds: "cat_oilseeds",
  spices: "cat_spices",
  flowers: "cat_flowers",
  other: "cat_other",
};

// The order categories appear in tabs and legends. Food crops first,
// because that is what most farmers using this are selling.
export const CATEGORY_ORDER = [
  "vegetables",
  "fruits",
  "cereals",
  "pulses",
  "oilseeds",
  "spices",
  "flowers",
  "other",
];

export function categoryColour(category) {
  return CATEGORY_COLOURS[category] || CATEGORY_COLOURS.other;
}

/** ₹12,345 - Indian digit grouping, which is what these numbers mean. */
export function formatRupees(value) {
  if (value == null) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

// Shared axis styling. Small and out of the way - the bars are the
// thing worth looking at.
//
// These are FUNCTIONS, not constants, and must be called inside the
// component that renders the chart: `tick={axisTick()}`. A constant
// would be evaluated once when the module first loads, which is fine
// today but silently wrong the moment any of these colours becomes
// theme-dependent - and that is a bug that looks like nothing until
// someone changes a token.
export function axisTick() {
  return {
    fontSize: 11,
    fill: readToken("muted-foreground", "#64748b"),
  };
}

export function gridStroke() {
  return readToken("border", "#e2e8f0");
}
