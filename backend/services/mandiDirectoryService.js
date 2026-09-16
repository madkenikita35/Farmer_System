// services/mandiDirectoryService.js
// -----------------------------------------------------------------------
// mandiApiService.js answers "what does CROP X cost?".
// This file answers the other direction: "what MANDIS exist, and what is
// being sold in each one?"
//
// It powers three new things in the app:
//   1. "N mandis registered"        -> getMandiDirectory().totalMandis
//   2. a searchable list of mandis  -> getMandiDirectory({ search, state })
//   3. click a mandi -> see every crop in it, government price AND what
//      our own farmers reported  -> getCropsInMandi()
//
// ---------------------------------------------------------------------
// THE CACHE - the most important idea in this file
// ---------------------------------------------------------------------
// The government dataset has no "list all mandis" endpoint. The only
// way to build that list is to download a big batch of price records
// and collect the distinct market names out of them.
//
// That download is slow (a few seconds). If we did it on every single
// keystroke of the search box, the app would crawl and we'd hammer
// data.gov.in for no reason.
//
// So we do it ONCE, keep the result in a normal JavaScript variable,
// and re-use it for 6 hours. That variable is `cache` below. This is
// called an "in-memory cache".
//
// Its one limitation, worth knowing: the cache lives in the server's
// memory, so restarting the server empties it and the next request is
// slow again. For a learning project that's completely fine. A real
// production app would use Redis instead.
// ---------------------------------------------------------------------

const axios = require("axios");
const Receipt = require("../models/Receipt");

const BASE_URL = "https://api.data.gov.in/resource";

// How long to trust a SUCCESSFUL cached mandi list before fetching it
// again. 6 hours, written out in milliseconds so it's easy to change.
const CACHE_LIFETIME_MS = 6 * 60 * 60 * 1000;

// How long to keep a FAILED result before trying the API again.
//
// This is deliberately short, and it matters more than it looks. The
// first version of this file cached a failed lookup for the full 6
// hours, exactly like a successful one. So if the government API was
// briefly slow when the server happened to start, the app served the
// 10-mandi sample list for the rest of the day - and no amount of
// refreshing helped, because the sample list itself was cached. The
// only cure was restarting the server.
//
// Two minutes is long enough to stop us hammering an API that's
// genuinely down, and short enough that a blip fixes itself.
const FAILED_CACHE_LIFETIME_MS = 2 * 60 * 1000;

// How many records to pull when building the directory. The government
// dataset returns a few thousand rows per day (one per mandi+crop), and
// 10000 comfortably covers a full day's reporting across all of India.
const DIRECTORY_FETCH_LIMIT = 10000;

// Our cache. `data` holds the built list, `fetchedAt` remembers when,
// and `lifetime` is how long THIS particular result should be trusted -
// six hours for real data, two minutes for a fallback (see above).
// All start empty, so the very first request always does a real fetch.
let cache = {
  data: null,
  fetchedAt: 0,
  lifetime: 0,
};

/**
 * Downloads a big batch of recent records and turns them into a list of
 * unique mandis. Only called when the cache is empty or stale.
 */
async function fetchMandiListFromApi() {
  const apiKey = process.env.MANDI_API_KEY;
  const resourceId = process.env.MANDI_RESOURCE_ID;

  if (!apiKey) {
    console.log("ℹ️  No MANDI_API_KEY set - using a small sample mandi list.");
    return { mandis: getMockMandiList(), dataSource: "mock", fallbackReason: "no-api-key" };
  }

  // Downloading several thousand records is a heavy request, and the
  // government API is sometimes slow enough to time out. So if the big
  // request fails we immediately retry with a smaller one: a partial
  // list of real mandis is far more useful than the sample list.
  const attempts = [
    { limit: DIRECTORY_FETCH_LIMIT, timeout: 45000 },
    { limit: 3000, timeout: 20000 },
  ];

  let records = [];
  let lastError = null;

  for (const attempt of attempts) {
    try {
      const response = await axios.get(`${BASE_URL}/${resourceId}`, {
        params: {
          "api-key": apiKey,
          format: "json",
          limit: attempt.limit,
        },
        timeout: attempt.timeout,
      });

      records = response.data.records || [];
      if (records.length > 0) break; // got what we needed
    } catch (error) {
      lastError = error;
      console.warn(
        `⚠️  Mandi list request (limit ${attempt.limit}) failed: ${error.message}`
      );
    }
  }

  if (records.length === 0) {
    // Tell the caller WHICH kind of problem this was, so the message
    // shown to the user is actually true. Saying "no API key is set"
    // when the key is fine and the API simply timed out sends whoever
    // is debugging this straight down the wrong path.
    const reason = lastError ? "api-unreachable" : "api-returned-nothing";
    console.error(
      `❌ Could not fetch the mandi list (${reason}) - falling back to the sample list. ` +
        `Will retry in ${FAILED_CACHE_LIFETIME_MS / 1000}s.`
    );
    return { mandis: getMockMandiList(), dataSource: "mock", fallbackReason: reason };
  }

  // ---- Collapse thousands of price rows into one row per mandi ----
  // The same mandi appears many times (once per crop it reported), so
  // we group by "market + state" and count how many distinct crops and
  // records each one has.
  const mandiMap = {};

  for (const record of records) {
    const market = record.market;
    const state = record.state || "Unknown State";
    if (!market) continue;

    // The key combines market AND state, because two states can each
    // have a mandi with the same name (there are several "Bazar"s).
    const key = `${market}|||${state}`;

    if (!mandiMap[key]) {
      mandiMap[key] = {
        mandiName: market,
        state,
        district: record.district || "",
        // A Set automatically ignores duplicates, which is exactly what
        // we want when counting how many DIFFERENT crops a mandi has.
        crops: new Set(),
        recordCount: 0,
        latestDate: record.arrival_date || "",
      };
    }

    if (record.commodity) mandiMap[key].crops.add(record.commodity);
    mandiMap[key].recordCount += 1;
  }

  // Turn the map into a plain array, converting each Set into a count.
  const mandis = Object.values(mandiMap).map((m) => ({
    mandiName: m.mandiName,
    state: m.state,
    district: m.district,
    cropCount: m.crops.size,
    recordCount: m.recordCount,
    latestDate: m.latestDate,
  }));

  // Sort alphabetically by state, then mandi name - so the list on
  // screen reads sensibly instead of in random API order.
  mandis.sort((a, b) => {
    if (a.state === b.state) return a.mandiName.localeCompare(b.mandiName);
    return a.state.localeCompare(b.state);
  });

  console.log(`✅ Mandi directory loaded: ${mandis.length} mandis from data.gov.in`);
  return { mandis, dataSource: "real", fallbackReason: null };
}

/**
 * The main "list the mandis" function used by the controller.
 *
 * @param {object} [options]
 * @param {string} [options.search] - filter by mandi/district name (partial, case-insensitive)
 * @param {string} [options.state]  - filter to one state
 * @returns {Promise<{ mandis: Array, totalMandis: number, matchCount: number, states: string[], dataSource: string }>}
 */
async function getMandiDirectory({ search = "", state = "" } = {}) {
  // ---- Step 1: get the full list, from cache if we can ----
  // Note `cache.lifetime`, not a fixed constant: a real list is trusted
  // for hours, a failed one for a couple of minutes. See the comment on
  // FAILED_CACHE_LIFETIME_MS for the bug this prevents.
  const cacheIsFresh = cache.data && Date.now() - cache.fetchedAt < cache.lifetime;

  if (!cacheIsFresh) {
    try {
      const result = await fetchMandiListFromApi();

      // If the fetch fell back to sample data but we still have a real
      // list from earlier, keep the older REAL list - stale but genuine
      // data beats ten made-up mandis.
      if (result.dataSource === "mock" && cache.data?.dataSource === "real") {
        console.warn("⚠️  Mandi API unavailable - serving the previously cached real list.");
        cache.fetchedAt = Date.now();
        cache.lifetime = FAILED_CACHE_LIFETIME_MS; // retry again shortly
      } else {
        cache.data = result;
        cache.fetchedAt = Date.now();
        cache.lifetime =
          result.dataSource === "real" ? CACHE_LIFETIME_MS : FAILED_CACHE_LIFETIME_MS;
      }
    } catch (error) {
      // fetchMandiListFromApi handles its own network errors, so getting
      // here means something unexpected broke (bad data shape, say).
      console.error("⚠️  Could not build mandi directory:", error.message);
      if (!cache.data) {
        cache.data = {
          mandis: getMockMandiList(),
          dataSource: "mock",
          fallbackReason: "unexpected-error",
        };
      }
      cache.fetchedAt = Date.now();
      cache.lifetime = FAILED_CACHE_LIFETIME_MS;
    }
  }

  const allMandis = cache.data.mandis;

  // ---- Step 2: apply the search/state filters to the cached list ----
  // Note this filtering happens on OUR server, over data already in
  // memory - which is why searching feels instant after the first load.
  let filtered = allMandis;

  if (state) {
    filtered = filtered.filter(
      (m) => m.state.toLowerCase() === state.toLowerCase()
    );
  }

  if (search) {
    const needle = search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.mandiName.toLowerCase().includes(needle) ||
        m.district.toLowerCase().includes(needle) ||
        m.state.toLowerCase().includes(needle)
    );
  }

  // The list of states, for the dropdown on the frontend.
  const states = [...new Set(allMandis.map((m) => m.state))].sort();

  return {
    mandis: filtered,
    totalMandis: allMandis.length, // "how many are registered in total"
    matchCount: filtered.length, // "how many matched your search"
    states,
    dataSource: cache.data.dataSource,
    // Why we fell back, so the page can say something truthful rather
    // than always blaming a missing API key.
    fallbackReason: cache.data.fallbackReason || null,
  };
}

/**
 * Everything being sold in ONE mandi: each crop, its government price,
 * and what OUR farmers reported paying at that same mandi.
 *
 * This is the "after searching a mandi we can see all the crops under
 * that mandi and their pricing, from both data sources" feature.
 *
 * @param {string} mandiName
 * @param {string} [state] - optional, to disambiguate same-named mandis
 */
async function getCropsInMandi(mandiName, state) {
  const apiKey = process.env.MANDI_API_KEY;
  const resourceId = process.env.MANDI_RESOURCE_ID;

  // ---- Source 1: the government's crops for this mandi ----
  let governmentCrops = [];
  let dataSource = "mock";

  if (apiKey) {
    try {
      const params = {
        "api-key": apiKey,
        format: "json",
        limit: 500,
        "filters[market]": mandiName, // ask the API for one market only
      };
      if (state) params["filters[state]"] = state;

      const response = await axios.get(`${BASE_URL}/${resourceId}`, {
        params,
        timeout: 15000,
      });

      const records = response.data.records || [];

      if (records.length > 0) {
        dataSource = "real";
        governmentCrops = records.map((r) => ({
          crop: r.commodity || "Unknown Crop",
          variety: r.variety || "",
          grade: r.grade || "",
          arrivalDate: r.arrival_date || "",
          modalPrice: Number(r.modal_price) || 0,
          minPrice: Number(r.min_price) || 0,
          maxPrice: Number(r.max_price) || 0,
        }));
      }
    } catch (error) {
      console.error(`⚠️  Could not fetch crops for "${mandiName}":`, error.message);
    }
  }

  // ---- Source 2: OUR farmers' receipts from this same mandi ----
  // Same collection communityPriceService.js reads, just grouped by
  // crop instead of by mandi.
  const receipts = await Receipt.find({
    mandiName: new RegExp(`^${escapeRegex(mandiName)}$`, "i"),
  }).sort({ createdAt: -1 });

  const farmerGroups = {};
  for (const r of receipts) {
    const key = r.crop;
    if (!farmerGroups[key]) farmerGroups[key] = [];
    farmerGroups[key].push(r);
  }

  const farmerCrops = Object.entries(farmerGroups).map(([crop, rows]) => {
    const prices = rows.map((r) => r.pricePerQuintal);
    return {
      crop,
      averagePrice: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      reportCount: rows.length,
      lastReportedDate: rows[0].date,
    };
  });

  // ---- Merge the two sources into one row per crop ----
  // We build a set of every crop name seen in EITHER source, so a crop
  // only our farmers reported still shows up (and vice versa).
  const allCropNames = new Set([
    ...governmentCrops.map((c) => c.crop),
    ...farmerCrops.map((c) => c.crop),
  ]);

  const crops = [...allCropNames].map((cropName) => {
    // A mandi can report the same crop in several varieties/grades, so
    // average them into one number per crop.
    const govRows = governmentCrops.filter(
      (c) => c.crop.toLowerCase() === cropName.toLowerCase()
    );
    const farmerRow = farmerCrops.find(
      (c) => c.crop.toLowerCase() === cropName.toLowerCase()
    );

    const governmentPrice =
      govRows.length > 0
        ? Math.round(
            govRows.reduce((sum, c) => sum + c.modalPrice, 0) / govRows.length
          )
        : null;

    const farmerPrice = farmerRow ? farmerRow.averagePrice : null;

    // How far apart are the two sources? Useful on its own: a big gap
    // means farmers here are consistently getting less than the
    // official rate.
    let difference = null;
    let differencePercent = null;
    if (governmentPrice != null && farmerPrice != null) {
      difference = farmerPrice - governmentPrice;
      differencePercent = Math.round((difference / governmentPrice) * 100);
    }

    return {
      crop: cropName,
      governmentPrice,
      governmentMinPrice: govRows.length > 0 ? Math.min(...govRows.map((c) => c.minPrice)) : null,
      governmentMaxPrice: govRows.length > 0 ? Math.max(...govRows.map((c) => c.maxPrice)) : null,
      governmentDate: govRows.length > 0 ? govRows[0].arrivalDate : "",
      farmerPrice,
      farmerReportCount: farmerRow ? farmerRow.reportCount : 0,
      farmerMinPrice: farmerRow ? farmerRow.minPrice : null,
      farmerMaxPrice: farmerRow ? farmerRow.maxPrice : null,
      difference,
      differencePercent,
    };
  });

  // Show crops alphabetically so the table is easy to scan.
  crops.sort((a, b) => a.crop.localeCompare(b.crop));

  return {
    mandiName,
    state: state || (governmentCrops.length > 0 ? state : ""),
    crops,
    totalCrops: crops.length,
    governmentCropCount: governmentCrops.length,
    farmerReportCount: receipts.length,
    dataSource,
  };
}

/**
 * A small sample list used when there's no API key yet, so the mandi
 * search page still works while you're learning the code.
 */
function getMockMandiList() {
  return [
    { mandiName: "Pune", state: "Maharashtra", district: "Pune", cropCount: 24, recordCount: 24, latestDate: "" },
    { mandiName: "Nashik", state: "Maharashtra", district: "Nashik", cropCount: 18, recordCount: 18, latestDate: "" },
    { mandiName: "Kolhapur", state: "Maharashtra", district: "Kolhapur", cropCount: 12, recordCount: 12, latestDate: "" },
    { mandiName: "Indore", state: "Madhya Pradesh", district: "Indore", cropCount: 20, recordCount: 20, latestDate: "" },
    { mandiName: "Bhopal", state: "Madhya Pradesh", district: "Bhopal", cropCount: 15, recordCount: 15, latestDate: "" },
    { mandiName: "Azadpur", state: "Delhi", district: "North Delhi", cropCount: 30, recordCount: 30, latestDate: "" },
    { mandiName: "Bengaluru", state: "Karnataka", district: "Bangalore", cropCount: 22, recordCount: 22, latestDate: "" },
    { mandiName: "Guntur", state: "Andhra Pradesh", district: "Guntur", cropCount: 16, recordCount: 16, latestDate: "" },
    { mandiName: "Ludhiana", state: "Punjab", district: "Ludhiana", cropCount: 14, recordCount: 14, latestDate: "" },
    { mandiName: "Jaipur", state: "Rajasthan", district: "Jaipur", cropCount: 19, recordCount: 19, latestDate: "" },
  ];
}

// Same helper as in communityPriceService.js - keeps a mandi name with
// brackets or dots from breaking the MongoDB regex query.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { getMandiDirectory, getCropsInMandi };
