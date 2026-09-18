// services/priceQuality.js
// -----------------------------------------------------------------------
// Removing prices that cannot be real, before anything ranks them.
//
// =======================================================================
// WHY THIS EXISTS AND WHY IT IS SHARED
// =======================================================================
// The government feed carries occasional junk. Onion on one day: 456
// rows, median Rs 6,250 - and two rows reading Rs 0.10 and Rs 18. Ten
// paise for a quintal of onion is a data-entry slip.
//
// Junk like that is harmless in an average over hundreds of rows, and
// ruinous anywhere something looks for an extreme:
//
//   * the "lowest price" card reported the cheapest onion in India as
//     Rs 0, with a price gap of 12,000,000%
//   * the Near Me page in BUY mode - which by definition hunts for the
//     smallest number - recommended a mandi selling onion at Rs 18
//
// It lives here, in one service, because both the Check Rates
// comparison and the Near Me search need it. It was written twice
// otherwise, and the second copy is the one that would have been
// forgotten - as indeed happened: Check Rates got the guard first and
// Near Me was left showing Rs 18 until buy mode made it obvious.
// =======================================================================

// A price below this fraction of the median is treated as an error.
const IMPOSSIBLE_FRACTION_OF_MEDIAN = 0.1;

// Below this many rows a median means little, so nothing is dropped.
const MIN_ROWS_TO_JUDGE = 3;

/**
 * Drops rows whose price is impossibly low for the crop.
 *
 * Self-calibrating: the threshold comes from the data, so it works for
 * cardamom at Rs 2,00,000 a quintal and for fodder at Rs 300 without a
 * hardcoded floor that would be wrong for one of them.
 *
 * DELIBERATELY ONE-SIDED. Nothing is trimmed from the top: a high
 * outlier is usually a premium grade that somebody genuinely paid, and
 * telling a farmer a mandi paid Rs 12,000 is the entire point of the
 * app. Only the bottom is filtered, where a zero is never a real trade.
 *
 * @param {Array} rows
 * @param {(row:any)=>number} getPrice - how to read the price off a row
 * @returns {{kept: Array, dropped: number, floor: number|null}}
 */
function dropImpossiblePrices(rows, getPrice = (r) => r.modalPrice) {
  if (!Array.isArray(rows) || rows.length < MIN_ROWS_TO_JUDGE) {
    return { kept: rows || [], dropped: 0, floor: null };
  }

  const sorted = rows.map(getPrice).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return { kept: rows, dropped: 0, floor: null };

  const median = sorted[Math.floor(sorted.length / 2)];
  const floor = median * IMPOSSIBLE_FRACTION_OF_MEDIAN;

  const kept = rows.filter((row) => getPrice(row) >= floor);

  return { kept, dropped: rows.length - kept.length, floor: Math.round(floor) };
}

module.exports = { dropImpossiblePrices };
