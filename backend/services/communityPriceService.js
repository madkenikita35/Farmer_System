// services/communityPriceService.js
// -----------------------------------------------------------------------
// This file is the SECOND data source the app compares against - not
// the government's official numbers, but "OUR data": the actual prices
// farmers using this app say they were paid, uploaded from receipts at
// DIFFERENT mandis in different locations.
//
// WHY THIS MATTERS
// The government's Agmarknet numbers are official, but they can lag by
// a day or miss a local mandi entirely. If ten farmers near you already
// uploaded receipts for the same crop this week, that's real, recent,
// on-the-ground evidence too - sometimes more useful than the official
// number. So the app shows BOTH, side by side, and lets the farmer
// judge for themselves.
//
// HOW IT WORKS
// Every time someone saves a receipt (see receiptController.js), it's
// stored in the shared `Receipt` collection in MongoDB. This file reads
// that SAME collection back out, grouped by mandi, to build a
// "what have other farmers actually been paid?" summary for a crop.
// There's no login system in this starter project, so every uploaded
// receipt is automatically part of this shared community pool - that's
// what makes "other farmers can see it" work with zero extra code.
// -----------------------------------------------------------------------

const Receipt = require("../models/Receipt");

// Only look at receipts from the last N days - a price a farmer got
// six months ago isn't a useful comparison for a sale happening today.
const RECENT_DAYS_WINDOW = 90;

/**
 * Builds a summary of what OTHER farmers have reported being paid for
 * a crop, grouped by mandi. Optionally narrowed down to one state.
 *
 * @param {string} crop
 * @param {string} [state] - optional, narrows results to one state
 * @returns {Promise<{
 *   records: Array<{ mandiName, state, averagePrice, minPrice, maxPrice, reportCount, lastReportedDate }>,
 *   overallAveragePrice: number | null,
 *   overallReportCount: number
 * }>}
 */
async function getCommunityPriceStats(crop, state) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RECENT_DAYS_WINDOW);

  // Case-insensitive match on crop name (farmers/OCR may type "wheat"
  // or "Wheat") and only recent receipts.
  const query = {
    crop: new RegExp(`^${escapeRegex(crop)}$`, "i"),
    createdAt: { $gte: cutoffDate },
  };
  if (state) {
    query.state = new RegExp(`^${escapeRegex(state)}$`, "i");
  }

  const receipts = await Receipt.find(query).sort({ createdAt: -1 });

  if (receipts.length === 0) {
    return { records: [], overallAveragePrice: null, overallReportCount: 0 };
  }

  // Group receipts by mandi name so we can show "Pune Mandi: farmers
  // report ₹X on average, based on 4 receipts" etc.
  const groups = {};
  for (const r of receipts) {
    const key = r.mandiName || "Unknown Mandi";
    if (!groups[key]) {
      groups[key] = { mandiName: key, state: r.state || "", prices: [], lastReportedDate: r.date };
    }
    groups[key].prices.push(r.pricePerQuintal);
    // Receipts are already sorted newest-first, so the first one we see
    // for this mandi has the most recent date.
    if (!groups[key].lastReportedDate) groups[key].lastReportedDate = r.date;
  }

  const records = Object.values(groups).map((g) => ({
    mandiName: g.mandiName,
    state: g.state,
    averagePrice: Math.round(g.prices.reduce((sum, p) => sum + p, 0) / g.prices.length),
    minPrice: Math.min(...g.prices),
    maxPrice: Math.max(...g.prices),
    reportCount: g.prices.length,
    lastReportedDate: g.lastReportedDate,
  }));

  const allPrices = receipts.map((r) => r.pricePerQuintal);
  const overallAveragePrice = Math.round(
    allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length
  );

  return { records, overallAveragePrice, overallReportCount: receipts.length };
}

// Small helper so a crop name with special regex characters (unlikely,
// but "Groundnut (Shelled)" style names could exist) never breaks the
// MongoDB query.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { getCommunityPriceStats };
