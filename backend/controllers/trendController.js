// controllers/trendController.js
// -----------------------------------------------------------------------
// The HTTP layer for the crop price-trend pages. All the real work is in
// services/priceTrendService.js - these functions only read the query
// string, check it, and hand back JSON.
//
// Two endpoints:
//
//   GET /api/prices/crops
//       Every crop we hold priced receipts for, with a short summary.
//       Fills the crops list page.
//
//   GET /api/prices/trend?crop=Onion&level=state&location=Maharashtra
//                        &from=2026-06-01&to=2026-09-01
//       The line itself: [{ date, averagePrice }, ...] sorted by date.
// -----------------------------------------------------------------------

const {
  getCropsWithHistory,
  getTrendFilterOptions,
  getPriceTrend,
} = require("../services/priceTrendService");
const { logActivity } = require("../services/activityService");

// The levels we accept. "city" is an alias for "mandi" - there is no
// city field in this data; see the note in priceTrendService.js.
const VALID_LEVELS = ["country", "state", "mandi", "city"];

/** "YYYY-MM-DD", or empty. Anything else is rejected rather than guessed at. */
function isValidDate(value) {
  if (!value) return true; // absent is fine - it just means "no bound"
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// ---------------------------------------------------------------------
// GET /api/prices/crops
// ---------------------------------------------------------------------
async function listCropsWithTrends(req, res) {
  try {
    const crops = await getCropsWithHistory();

    res.status(200).json({
      crops,
      totalCrops: crops.length,
      // How many of them have enough points to actually draw a line.
      // The page uses this to set expectations up front instead of
      // letting every second card lead to an empty chart.
      chartableCrops: crops.filter((c) => c.dayCount > 1).length,
      source: "farmer-receipts",
    });
  } catch (error) {
    console.error("Error listing crops with trends:", error);
    res.status(500).json({ message: "Failed to load the crop list." });
  }
}

// ---------------------------------------------------------------------
// GET /api/prices/trend
// ---------------------------------------------------------------------
async function getTrend(req, res) {
  try {
    const { crop = "", level = "country", location = "", from = "", to = "" } = req.query;

    // ---- Validation ----
    // Everything here arrives from a URL, so it is all untrusted. The
    // service builds a RegExp out of `crop` and `location`, and escapes
    // them before doing so - but a length cap as well means a caller
    // cannot hand us a megabyte of text to compile.
    if (typeof crop !== "string" || crop.trim() === "") {
      return res.status(400).json({ message: "Please say which crop you want the trend for." });
    }

    if (crop.length > 80 || String(location).length > 120) {
      return res.status(400).json({ message: "That crop or place name is too long." });
    }

    if (!VALID_LEVELS.includes(level)) {
      return res.status(400).json({
        message: `level must be one of: ${VALID_LEVELS.join(", ")}`,
      });
    }

    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ message: "Dates must look like 2026-09-17." });
    }

    if (from && to && from > to) {
      return res.status(400).json({ message: "The start date must come before the end date." });
    }

    // A level that needs a place but was not given one is a bad
    // request, not an empty chart - saying so is more useful than
    // silently returning the national average under a "Maharashtra"
    // heading.
    if ((level === "state" || level === "mandi" || level === "city") && !location.trim()) {
      return res.status(400).json({
        message: "Please choose a place for this view.",
      });
    }

    const [trend, options] = await Promise.all([
      getPriceTrend({ crop: crop.trim(), level, location: location.trim(), from, to }),
      getTrendFilterOptions(crop.trim()),
    ]);

    // Only log a real look-up, and only once per crop+level - the page
    // refetches whenever a dropdown changes, and logging every one of
    // those would bury the admin's activity feed.
    if (trend.pointCount > 0) {
      await logActivity(
        req.user,
        "VIEW_TREND",
        `Viewed the ${trend.level} price trend for ${crop.trim()}`,
        { crop: crop.trim(), level: trend.level, location: trend.location }
      );
    }

    res.status(200).json({ ...trend, options });
  } catch (error) {
    console.error("Error building price trend:", error);
    res.status(500).json({ message: "Failed to build the price trend." });
  }
}

module.exports = { listCropsWithTrends, getTrend };
