// services/mandiApiService.js
// -----------------------------------------------------------------------
// This file talks to the GOVERNMENT's live Mandi price API (data.gov.in).
// That dataset is the same kind of "Agmarknet" data that Gramhal's
// Bolbhav app was built around.
//
// WHY A SEPARATE "SERVICE" FILE?
// Controllers should focus on handling requests/responses.
// Anything that talks to an OUTSIDE system (a 3rd-party API, in this case)
// is kept in its own "service" file. This makes the code easier to test,
// reuse, and understand - a common, fresher-friendly pattern.
//
// WHAT CHANGED IN THIS VERSION (real-data + date matching)
// -----------------------------------------------------------------------
// Earlier, this file just grabbed up to 50 records for a crop and
// averaged them, with NO regard for which date those records were
// actually reported on. That meant "today's" comparison could quietly
// be built from prices reported days ago.
//
// Now we:
//   1. Ask the government API for records on the EXACT date the farmer
//      sold their crop (using the dataset's own "arrival_date" filter).
//   2. If nothing was reported that exact date (very common - not every
//      mandi reports every day), we fetch a bigger page of recent
//      records for that crop and pick the CLOSEST available date
//      instead of silently mixing dates together.
//   3. Only if the real API has genuinely NO data at all for that crop
//      (or there's no API key / no internet) do we fall back to mock
//      data - and we always tell the caller which situation happened,
//      via `dataSource` and `matchedDate`, so the frontend can be
//      honest with the user about where the numbers came from.
// -----------------------------------------------------------------------

const axios = require("axios");
const { recordSuccessfulSync, SOURCES } = require("./syncStatusService");

const BASE_URL = "https://api.data.gov.in/resource";

/**
 * Converts a "YYYY-MM-DD" (the format an HTML <input type="date"> gives
 * us) into "DD/MM/YYYY" (the format the data.gov.in Mandi dataset uses
 * for its arrival_date field).
 */
function toDdMmYyyy(isoDateStr) {
  const [year, month, day] = isoDateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Converts a "DD/MM/YYYY" string (as returned by the API) into a real
 * JS Date object, so we can compare/sort dates and measure "closeness".
 */
function parseDdMmYyyy(ddMmYyyyStr) {
  const [day, month, year] = ddMmYyyyStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Normalises one raw API record into the clean shape the rest of our
 * app relies on. The government API returns every field as a STRING
 * (even prices), so we convert numbers with Number(...).
 */
function normaliseRecord(r) {
  return {
    market: r.market || "Unknown Market",
    state: r.state || "Unknown State",
    // The district is what lets the "nearest mandi" feature put this
    // record on a map - see services/locationService.js. It's simply an
    // extra field: everything that used this shape before carries on
    // working and just ignores it.
    district: r.district || "",
    arrivalDate: r.arrival_date || "",
    modalPrice: Number(r.modal_price) || 0,
    minPrice: Number(r.min_price) || 0,
    maxPrice: Number(r.max_price) || 0,
  };
}

/**
 * Low-level helper: hits the data.gov.in API once with whatever filters
 * we give it. Kept separate so fetchMandiPrices() below stays readable.
 */
async function callMandiApi({ apiKey, resourceId, commodity, arrivalDate, limit }) {
  const params = {
    "api-key": apiKey,
    format: "json",
    limit,
    "filters[commodity]": commodity,
  };

  // Only add the date filter when we actually have one - passing an
  // empty filter to the API can behave differently across datasets.
  if (arrivalDate) {
    params["filters[arrival_date]"] = arrivalDate;
  }

  const response = await axios.get(`${BASE_URL}/${resourceId}`, {
    params,
    // A bigger request needs longer. The 10s that suited a 100-record
    // fetch is not enough for the 2000 the "near me" page asks for.
    timeout: limit > 500 ? 45000 : 10000,
  });

  const records = response.data.records || [];

  // Remember that the government feed answered, and with how much.
  // Fire-and-forget on purpose: the farmer waiting on prices should not
  // also wait on our bookkeeping, and a failure here costs nothing.
  recordSuccessfulSync(SOURCES.AGMARKNET, records.length);

  return records;
}

/**
 * Fetches mandi prices for a given crop, matched as closely as possible
 * to the given date, from data.gov.in. Falls back to mock data only
 * when the real API genuinely has nothing to offer.
 *
 * @param {string} commodity - crop name, e.g. "Wheat", "Onion", "Tomato"
 * @param {string} [dateStr] - "YYYY-MM-DD" date the farmer sold the crop.
 *                              Defaults to today if not given.
 * @returns {Promise<{
 *   prices: Array<{market, state, arrivalDate, modalPrice, minPrice, maxPrice}>,
 *   dataSource: "real-exact-date" | "real-nearest-date" | "mock",
 *   matchedDate: string | null
 * }>}
 */
async function fetchMandiPrices(commodity, dateStr, options = {}) {
  const apiKey = process.env.MANDI_API_KEY;
  const resourceId = process.env.MANDI_RESOURCE_ID;
  const isoDate = dateStr || new Date().toISOString().slice(0, 10);

  // How many records to ask for. These defaults are the values this
  // function has always used, so every existing caller behaves exactly
  // as before - they simply don't pass an `options` argument.
  //
  // The "nearest mandi" feature DOES pass one, and asks for far more.
  // It needs to: a popular crop like Onion has 500+ records nationwide,
  // and with only 100 of them the farmer's own local mandi can easily be
  // among the 400 we never looked at. For a page whose whole job is
  // "what's near me?", missing nearby mandis defeats the point.
  const exactDateLimit = options.limit || 100;
  const widerLimit = options.limit || 300;

  // If the developer hasn't added a real API key yet, skip straight
  // to mock data instead of making a doomed network call.
  if (!apiKey) {
    console.log("ℹ️  No MANDI_API_KEY set - using mock mandi data.");
    return { prices: getMockMandiPrices(commodity), dataSource: "mock", matchedDate: null };
  }

  try {
    // ---- ATTEMPT 1: exact date match ----
    const targetDdMmYyyy = toDdMmYyyy(isoDate);
    const exactRecords = await callMandiApi({
      apiKey,
      resourceId,
      commodity,
      arrivalDate: targetDdMmYyyy,
      limit: exactDateLimit,
    });

    if (exactRecords.length > 0) {
      return {
        prices: exactRecords.map(normaliseRecord),
        dataSource: "real-exact-date",
        matchedDate: targetDdMmYyyy,
      };
    }

    // ---- ATTEMPT 2: no exact match - pull a wider, recent batch for
    // this crop (no date filter) and pick whichever date is CLOSEST to
    // the one we wanted, instead of blending multiple days together. ----
    const widerRecords = await callMandiApi({
      apiKey,
      resourceId,
      commodity,
      arrivalDate: null,
      limit: widerLimit,
    });

    if (widerRecords.length === 0) {
      console.log(`ℹ️  API has no records at all for "${commodity}" - using mock data.`);
      return { prices: getMockMandiPrices(commodity), dataSource: "mock", matchedDate: null };
    }

    const targetDate = parseDdMmYyyy(targetDdMmYyyy);

    // Group records by their arrival_date so we can score each date by
    // "how close is it to the date we wanted?" and pick the best one.
    const recordsByDate = {};
    for (const r of widerRecords) {
      const key = r.arrival_date;
      if (!key) continue;
      if (!recordsByDate[key]) recordsByDate[key] = [];
      recordsByDate[key].push(r);
    }

    let closestDateKey = null;
    let smallestGapInDays = Infinity;
    for (const dateKey of Object.keys(recordsByDate)) {
      const gapInDays = Math.abs(
        (parseDdMmYyyy(dateKey) - targetDate) / (1000 * 60 * 60 * 24)
      );
      if (gapInDays < smallestGapInDays) {
        smallestGapInDays = gapInDays;
        closestDateKey = dateKey;
      }
    }

    if (!closestDateKey) {
      return { prices: getMockMandiPrices(commodity), dataSource: "mock", matchedDate: null };
    }

    return {
      prices: recordsByDate[closestDateKey].map(normaliseRecord),
      dataSource: "real-nearest-date",
      matchedDate: closestDateKey,
    };
  } catch (error) {
    console.error("⚠️  Mandi API call failed, falling back to mock data:", error.message);
    return { prices: getMockMandiPrices(commodity), dataSource: "mock", matchedDate: null };
  }
}

/**
 * Generates believable sample mandi price data for a crop, so that the
 * whole app (comparison logic + dashboard charts) works out of the box
 * even before you've set up a real API key, or on the rare day the
 * government API is fully unreachable.
 *
 * FRESHER TIP: This is a great place to practice - try changing the
 * sample mandi names, or the price ranges, and see the dashboard update!
 */
function getMockMandiPrices(commodity) {
  const sampleMandis = [
    { market: "Pune Mandi", state: "Maharashtra" },
    { market: "Nashik Mandi", state: "Maharashtra" },
    { market: "Indore Mandi", state: "Madhya Pradesh" },
    { market: "Azadpur Mandi", state: "Delhi" },
    { market: "Bengaluru Mandi", state: "Karnataka" },
    { market: "Guntur Mandi", state: "Andhra Pradesh" },
  ];

  // Use the commodity name to generate a semi-consistent "base price",
  // just so different crops don't all look identical in the demo.
  const basePrice = 1500 + (commodity.length % 10) * 200;

  return sampleMandis.map((m) => {
    const wobble = Math.floor(Math.random() * 400) - 200; // +/- 200
    const modalPrice = Math.max(500, basePrice + wobble);
    return {
      market: m.market,
      state: m.state,
      arrivalDate: "",
      modalPrice,
      minPrice: modalPrice - 150,
      maxPrice: modalPrice + 150,
    };
  });
}

module.exports = { fetchMandiPrices };
