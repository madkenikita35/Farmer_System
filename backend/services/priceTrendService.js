// services/priceTrendService.js
// -----------------------------------------------------------------------
// The data behind the crop price-trend line graphs.
//
// =======================================================================
// WHERE THE HISTORY COMES FROM - AND WHERE IT DOES NOT
// =======================================================================
// A trend needs prices over TIME. We have exactly one source of that:
// the receipts our own farmers upload. Each receipt carries a date, a
// crop, a mandi, a state and the price actually paid.
//
// The government feed cannot help here, and it is worth writing down
// why so nobody wastes a day rediscovering it:
//
//   - The whole data.gov.in resource is a SINGLE DAY. Today it holds
//     13,515 rows, every one of them dated 17/09/2026.
//
//   - It accepts a `filters[arrival_date]` parameter and then IGNORES
//     it. Ask for a date a year ago and you get today's rows back,
//     stamped with today's date, plus a plausible-looking `total`. It
//     looks like it works until you read the arrival_date field on the
//     rows that come back.
//
// So every point on these charts is a real receipt a real farmer
// uploaded. That is honest, and it is also why a crop nobody has
// uploaded twice shows an empty state rather than a line.
//
// =======================================================================
// THE THREE LEVELS
// =======================================================================
//   mandi    - one market, e.g. "APMC Rahuri"   (the "city" tab)
//   state    - every mandi in one state
//   country  - every mandi we have, one national average line
//
// There is no "city" field in the data - the fields are mandi, district
// and state - so the city tab filters by MANDI, which is the actual
// place a farmer sells. "city" is accepted as an alias so the URL in
// the spec keeps working.
//
// =======================================================================
// WHY THE AVERAGING HAPPENS HERE AND NOT IN REACT
// =======================================================================
// All of it runs as a MongoDB aggregation pipeline, so the database
// does the grouping and returns one small row per date. The alternative
// - shipping every raw receipt to the browser and averaging there -
// gets slower with every receipt uploaded, and sends the browser data
// it has no business holding.
// -----------------------------------------------------------------------

const Receipt = require("../models/Receipt");

/** Makes a user-supplied string safe to drop into a RegExp. */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * An anchored, case-insensitive match.
 *
 * Crop and mandi names reach us from OCR as free text, so the same crop
 * is stored as "Tomato" and "tomato" on different receipts. Matching
 * case-sensitively would split one crop's history into two half-empty
 * lines.
 */
function exactIgnoringCase(value) {
  return new RegExp(`^${escapeRegex(String(value).trim())}$`, "i");
}

/**
 * Every crop we hold at least one priced receipt for, with enough
 * summary to fill a card on the crops list page.
 *
 * Grouped on the LOWERCASED name so "Tomato" and "tomato" are one crop,
 * while `displayName` keeps a real spelling to show on screen.
 *
 * @returns {Promise<Array<{crop, receiptCount, dayCount, firstDate, lastDate, averagePrice, latestPrice}>>}
 */
async function getCropsWithHistory() {
  const rows = await Receipt.aggregate([
    {
      $match: {
        crop: { $type: "string", $ne: "" },
        pricePerQuintal: { $gt: 0 },
        // The SAME date filter the trend query uses.
        //
        // Older receipts have no date, and the trend cannot plot those.
        // Counting them here anyway meant a card advertising "7
        // receipts" opened a chart built from 4 - the card was
        // promising points the graph could never draw. Both numbers now
        // come from the same set of rows.
        date: { $type: "string", $ne: "" },
      },
    },
    { $sort: { date: 1 } },
    {
      $group: {
        _id: { $toLower: { $trim: { input: "$crop" } } },
        // A real spelling to display. $last after sorting by date means
        // the most recently used spelling wins, which is the one the
        // farmer is most likely to recognise.
        displayName: { $last: "$crop" },
        receiptCount: { $sum: 1 },
        averagePrice: { $avg: "$pricePerQuintal" },
        latestPrice: { $last: "$pricePerQuintal" },
        firstDate: { $min: "$date" },
        lastDate: { $max: "$date" },
        // Distinct dates: how many POINTS a line for this crop would
        // have. One point cannot be a line, and the list page uses this
        // to say so honestly before the farmer clicks through.
        dates: { $addToSet: "$date" },
      },
    },
    {
      $project: {
        _id: 0,
        crop: "$displayName",
        receiptCount: 1,
        averagePrice: { $round: ["$averagePrice", 0] },
        latestPrice: 1,
        firstDate: 1,
        lastDate: 1,
        dayCount: { $size: "$dates" },
      },
    },
    { $sort: { receiptCount: -1, crop: 1 } },
  ]);

  return rows;
}

/**
 * The mandis and states we hold receipts for, for one crop - used to
 * fill the two dropdowns on the trend page.
 *
 * Only places that actually have data are offered. Listing every mandi
 * in India and having most of them draw an empty chart would be a
 * worse experience than a short, honest list.
 */
async function getTrendFilterOptions(crop) {
  const rows = await Receipt.aggregate([
    {
      $match: {
        crop: exactIgnoringCase(crop),
        pricePerQuintal: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        mandis: { $addToSet: "$mandiName" },
        states: { $addToSet: "$state" },
      },
    },
  ]);

  if (rows.length === 0) return { mandis: [], states: [] };

  // Drop blanks - plenty of older receipts have no state recorded, and
  // an empty entry in a dropdown is just confusing.
  const clean = (list) =>
    (list || [])
      .filter((value) => typeof value === "string" && value.trim() !== "")
      .sort((a, b) => a.localeCompare(b));

  return { mandis: clean(rows[0].mandis), states: clean(rows[0].states) };
}

/**
 * The line itself: average price per date.
 *
 * @param {object} options
 * @param {string} options.crop     - required
 * @param {string} [options.level]  - "mandi" | "city" | "state" | "country"
 * @param {string} [options.location] - the mandi or state name, for those levels
 * @param {string} [options.from]   - "YYYY-MM-DD" inclusive
 * @param {string} [options.to]     - "YYYY-MM-DD" inclusive
 * @returns {Promise<{points: Array<{date, averagePrice, reportCount, minPrice, maxPrice}>, ...}>}
 */
async function getPriceTrend({ crop, level = "country", location = "", from = "", to = "" }) {
  // "city" is accepted as an alias for "mandi" - see the note at the
  // top about there being no city field in this data.
  const resolvedLevel = level === "city" ? "mandi" : level;

  const match = {
    crop: exactIgnoringCase(crop),
    pricePerQuintal: { $gt: 0 },
    // Receipts written before the date field existed have null here.
    // $type: "string" quietly drops those rather than letting them
    // group into a null bucket that would plot at the far left.
    date: { $type: "string", $ne: "" },
  };

  if (from) match.date.$gte = from;
  if (to) match.date.$lte = to;

  if (resolvedLevel === "mandi" && location) {
    match.mandiName = exactIgnoringCase(location);
  } else if (resolvedLevel === "state" && location) {
    match.state = exactIgnoringCase(location);
  }

  const points = await Receipt.aggregate([
    { $match: match },
    {
      // One row per DAY. This is the whole point of doing it in the
      // database: however many receipts exist, what comes back is one
      // small object per date.
      $group: {
        _id: "$date",
        averagePrice: { $avg: "$pricePerQuintal" },
        minPrice: { $min: "$pricePerQuintal" },
        maxPrice: { $max: "$pricePerQuintal" },
        reportCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } }, // "YYYY-MM-DD" sorts correctly as text
    {
      $project: {
        _id: 0,
        date: "$_id",
        averagePrice: { $round: ["$averagePrice", 0] },
        minPrice: 1,
        maxPrice: 1,
        reportCount: 1,
      },
    },
  ]);

  const totalReports = points.reduce((sum, p) => sum + p.reportCount, 0);

  return {
    crop,
    level: resolvedLevel,
    location: resolvedLevel === "country" ? null : location || null,
    from: from || null,
    to: to || null,
    points,
    pointCount: points.length,
    totalReports,
    // Said explicitly so the page can explain itself rather than just
    // drawing a short line and leaving the farmer to wonder.
    source: "farmer-receipts",
  };
}

module.exports = { getCropsWithHistory, getTrendFilterOptions, getPriceTrend };
