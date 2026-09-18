// controllers/cedaController.js
// -----------------------------------------------------------------------
// The HTTP layer for the CEDA-powered crop price trend pages.
//
//   GET /api/crops
//       Every crop CEDA has, simplified for the crops list page.
//
//   GET /api/locations
//       States and their districts, for the dropdowns.
//
//   GET /api/crops/:cropName/price-trend?level=&location=&from=&to=
//       The line: [{ date, averagePrice }, ...] sorted by date.
//
// All the CEDA talking lives in services/cedaService.js. This file turns
// names into IDs, picks the right shape of request, and averages the
// rows before they go out.
// -----------------------------------------------------------------------

const ceda = require("../services/cedaService");
const { logActivity } = require("../services/activityService");

// How far back to look when the caller gives no date range.
//
// Not "all of it": CEDA holds data from 2010, and a 15-year national
// query is a slow response and a chart with 5,000 points nobody can
// read. Two years is enough to show a seasonal pattern.
const DEFAULT_LOOKBACK_YEARS = 2;

const VALID_LEVELS = ["country", "state", "city", "district", "market"];

/** "YYYY-MM-DD" or empty. Rejected rather than guessed at. */
function isValidDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Turns CEDA's raw rows into the array the chart wants.
 *
 * =====================================================================
 * WHY THIS AVERAGING EXISTS
 * =====================================================================
 * How many rows CEDA returns depends on the level:
 *
 *   national / state  -> ONE row per date, already aggregated
 *   district / market -> one row per MARKET per date
 *
 * So at district level a single date arrives as a dozen rows, one per
 * mandi in that district. Those have to be collapsed into one number
 * per date or the chart would plot twelve points stacked on the same x.
 *
 * It happens HERE, on the server, rather than in the browser - as
 * requested, and because shipping 144 rows so React can average them is
 * work the database-side has already half done.
 *
 * WHICH NUMBER IS "THE" PRICE: modal_price. That is the most-traded
 * price on the day - the one a farmer is most likely to actually get.
 * Averaging min and max instead would give the midpoint of the extremes,
 * which is a number nobody was ever paid. min and max still come along
 * for the tooltip, so the spread is visible.
 */
function toChartPoints(rows) {
  const byDate = new Map();

  for (const row of rows) {
    if (!row || !row.date) continue;

    const modal = Number(row.modal_price);
    if (!Number.isFinite(modal) || modal <= 0) continue;

    if (!byDate.has(row.date)) {
      byDate.set(row.date, { modalSum: 0, count: 0, min: Infinity, max: -Infinity });
    }

    const bucket = byDate.get(row.date);
    bucket.modalSum += modal;
    bucket.count += 1;

    const min = Number(row.min_price);
    const max = Number(row.max_price);
    if (Number.isFinite(min) && min > 0) bucket.min = Math.min(bucket.min, min);
    if (Number.isFinite(max) && max > 0) bucket.max = Math.max(bucket.max, max);
  }

  return [...byDate.entries()]
    .map(([date, b]) => ({
      date,
      averagePrice: Math.round(b.modalSum / b.count),
      minPrice: b.min === Infinity ? null : Math.round(b.min),
      maxPrice: b.max === -Infinity ? null : Math.round(b.max),
      // How many markets went into this point. One market and twenty
      // markets deserve different amounts of trust, and the tooltip
      // shows it.
      marketCount: b.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // "YYYY-MM-DD" sorts as text
}

/**
 * Maps a cedaService error onto an HTTP status the frontend can act on.
 *
 * A rate limit is NOT a server error. Returning 500 for it would have
 * the page say "something went wrong" when the truthful and far more
 * useful answer is "the data service allows 40 requests an hour and
 * they are used up; try again in 24 minutes".
 */
function statusFor(error) {
  if (error.code === "CEDA_RATE_LIMITED" || error.status === 429) return 429;
  if (error.status === 401) return 502; // their key problem, not the caller's
  if (error.code === "CEDA_NOT_CONFIGURED") return 503;
  return 500;
}

/** A 503 with a clear message when the key is missing, rather than a 500. */
function guardConfigured(res) {
  if (ceda.isConfigured()) return false;

  res.status(503).json({
    message:
      "The crop price service is not configured. Add CEDA_API_KEY to backend/.env and restart the server.",
    code: "CEDA_NOT_CONFIGURED",
  });
  return true;
}

// ---------------------------------------------------------------------
// GET /api/crops
// ---------------------------------------------------------------------
async function listCrops(req, res) {
  if (guardConfigured(res)) return;

  try {
    const commodities = await ceda.getCommodities();

    res.status(200).json({
      crops: commodities.map((c) => ({ id: c.id, name: c.name })),
      totalCrops: commodities.length,
      source: "ceda",
    });
  } catch (error) {
    console.error("Error listing CEDA crops:", error.message);
    res.status(statusFor(error)).json({
      message: error.message,
      code: error.code,
      minutesUntilReset: error.minutesUntilReset,
    });
  }
}

// ---------------------------------------------------------------------
// GET /api/locations
// ---------------------------------------------------------------------
async function listLocations(req, res) {
  if (guardConfigured(res)) return;

  try {
    const geographies = await ceda.getGeographies();

    // A flat district list as well as the nested one. The "city"
    // dropdown is a single <select> of districts, and doing the
    // flattening here keeps that component simple - it also carries the
    // parent state, which CEDA needs alongside the district id.
    const districts = [];
    for (const state of geographies) {
      for (const district of state.districts || []) {
        districts.push({
          districtId: district.district_id,
          districtName: district.district_name,
          stateId: state.state_id,
          stateName: state.state_name,
        });
      }
    }

    res.status(200).json({
      states: geographies.map((s) => ({
        stateId: s.state_id,
        stateName: s.state_name,
        districtCount: (s.districts || []).length,
      })),
      districts,
      totalStates: geographies.length,
      totalDistricts: districts.length,
      source: "ceda",
    });
  } catch (error) {
    console.error("Error listing CEDA locations:", error.message);
    res.status(statusFor(error)).json({
      message: error.message,
      code: error.code,
      minutesUntilReset: error.minutesUntilReset,
    });
  }
}

// ---------------------------------------------------------------------
// GET /api/crops/:cropName/price-trend
// ---------------------------------------------------------------------
async function getPriceTrend(req, res) {
  if (guardConfigured(res)) return;

  try {
    const cropName = decodeURIComponent(req.params.cropName || "");
    const { level = "country", location = "", from = "", to = "" } = req.query;

    // ---- Validate before spending a slow upstream call ----
    if (!cropName.trim()) {
      return res.status(400).json({ message: "Please say which crop you want." });
    }

    if (!VALID_LEVELS.includes(level)) {
      return res
        .status(400)
        .json({ message: `level must be one of: ${VALID_LEVELS.join(", ")}` });
    }

    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ message: "Dates must look like 2025-09-17." });
    }

    if (from && to && from > to) {
      return res
        .status(400)
        .json({ message: "The start date must come before the end date." });
    }

    if (level !== "country" && !String(location).trim()) {
      return res.status(400).json({ message: "Please choose a place for this view." });
    }

    // ---- Name -> id ----
    const commodity = await ceda.findCommodity(cropName);
    if (!commodity) {
      return res.status(404).json({ message: `CEDA has no crop called "${cropName}".` });
    }

    // ---- Work out which ids to send ----
    //
    // Remember: there is no "level" field in CEDA's API. The level is
    // decided by WHICH IDS are present. state_id 0 means all India.
    let stateId = 0;
    let districtIds;
    let resolvedPlace = null;

    if (level === "state") {
      const state = await ceda.findState(location);
      if (!state) {
        return res.status(404).json({ message: `No state called "${location}".` });
      }
      stateId = state.state_id;
      resolvedPlace = state.state_name;
    } else if (level === "city" || level === "district" || level === "market") {
      // "city" is this app's word for a district - CEDA's hierarchy is
      // state -> district -> market, with no city in it.
      const found = await ceda.findDistrict(location);
      if (!found) {
        return res.status(404).json({ message: `No district called "${location}".` });
      }
      stateId = found.state.state_id;
      districtIds = [found.district.district_id];
      resolvedPlace = `${found.district.district_name}, ${found.state.state_name}`;
    }

    // ---- Dates ----
    const fromDate = from || isoDaysAgo(365 * DEFAULT_LOOKBACK_YEARS);
    const toDate = to || new Date().toISOString().slice(0, 10);

    const rows = await ceda.getPrices({
      commodityId: commodity.id,
      stateId,
      districtIds,
      fromDate,
      toDate,
    });

    const points = toChartPoints(rows);

    // CEDA's own words when a valid query simply has nothing in it.
    // Passed through so the page can say "no data for these filters"
    // rather than implying something broke.
    const upstreamMessage = rows.message || "";

    if (points.length > 0) {
      await logActivity(
        req.user,
        "VIEW_TREND",
        `Viewed the ${level} price trend for ${commodity.name}`,
        { crop: commodity.name, level, location: resolvedPlace }
      );
    }

    res.status(200).json({
      crop: commodity.name,
      cropId: commodity.id,
      level,
      location: resolvedPlace,
      requestedFrom: fromDate,
      requestedTo: toDate,
      points,
      pointCount: points.length,
      // The range actually covered by the data, which is NOT the range
      // asked for. CEDA's data stops well short of today, so the page
      // uses this to anchor its "last 30 days" buttons to real data
      // instead of to a today that has none.
      coverage:
        points.length > 0
          ? { from: points[0].date, to: points[points.length - 1].date }
          : null,
      upstreamMessage,
      source: "ceda",
    });
  } catch (error) {
    console.error("Error building CEDA price trend:", error.message);
    res.status(statusFor(error)).json({
      message: error.message,
      code: error.code,
      minutesUntilReset: error.minutesUntilReset,
    });
  }
}

module.exports = { listCrops, listLocations, getPriceTrend };
