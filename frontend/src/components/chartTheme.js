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
// -----------------------------------------------------------------------

// One colour per crop category. Chosen to be distinguishable from each
// other AND to feel like the thing they describe: leafy green for
// vegetables, ripe red for fruit, grain-gold for cereals.
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

// Shared axis styling. Light grey, small, out of the way - the bars are
// the thing worth looking at.
export const AXIS_TICK = { fontSize: 11, fill: "#64748b" };
export const GRID_STROKE = "#e2e8f0";
