// services/cedaService.js
// -----------------------------------------------------------------------
// A wrapper around the CEDA Agmarknet API (Centre for Economic Data &
// Analysis, Ashoka University).
//
//     https://api.ceda.ashoka.edu.in/v1
//     Docs: https://api.ceda.ashoka.edu.in/documentation/
//
// =======================================================================
// WHY WE WANTED THIS
// =======================================================================
// data.gov.in gives us today's prices and nothing else. Its whole
// resource is a single day, and its `filters[arrival_date]` parameter is
// accepted and then ignored - ask for last week and you get today's rows
// back, stamped today. So no price TREND could be built from it.
//
// CEDA serves the same Agmarknet data with real history and a from/to
// date range, which is what makes the trend charts possible.
//
// =======================================================================
// THE ONE THING TO UNDERSTAND: THERE IS NO "level" PARAMETER
// =======================================================================
// It is tempting to look for a field saying "national" or "state". There
// isn't one. The geographic level is decided by WHICH IDS YOU SEND:
//
//     state_id: 0                                  -> all India
//     state_id: 29                                 -> that whole state
//     state_id: 29, district_id: [523]             -> that district
//     state_id: 29, district_id: [523],
//                   market_id: [1234]              -> that one market
//
// state_id: 0 meaning "everywhere" is the surprising part, and it is
// straight from the spec: "Use 0 for all India level data".
//
// Note also that district_id and market_id are ARRAYS, even for one.
//
// =======================================================================
// EVERYTHING IS AN ID, NOT A NAME
// =======================================================================
// CEDA speaks in integers: commodity_id, state_id, district_id. The app
// speaks in names ("Onion", "Maharashtra"). The lookup tables come from
// /commodities and /geographies, which is why both are cached here - see
// the cache note below.
// -----------------------------------------------------------------------

const axios = require("axios");
const { KEYS, readCache, writeCache } = require("./persistentCache");
const { recordSuccessfulSync, SOURCES } = require("./syncStatusService");

const BASE_URL = "https://api.ceda.ashoka.edu.in/v1";

// How long to wait on a single request before giving up.
//
// This is long on purpose. District-level price queries are slow - a
// 10-day Nashik query returns 144 rows (one per market per day) and a
// 45s timeout was not enough; a month-long one came back as a 504 from
// CEDA's own gateway. 90s covers the realistic cases.
const REQUEST_TIMEOUT_MS = 90000;

// =====================================================================
// THE RESPONSE ENVELOPE - AND WHY THE PUBLISHED SPEC CANNOT BE TRUSTED
// =====================================================================
// The OpenAPI document at /documentation/ describes responses like
//
//     { "commodities": [ { "id": 1, "name": "Wheat" } ] }
//
// The server actually returns
//
//     { "output": { "type": "success", "message": "Data exists",
//                   "data": [ { "commodity_id": 1,
//                               "commodity_name": "Wheat" } ] } }
//
// Different envelope, different field names. Worse, the geographies
// endpoint is documented as states with districts NESTED inside them
// and actually returns a FLAT list of state-district pairs.
//
// A request against the documented shape returns HTTP 200 and parses to
// an empty list - it fails silently, looking exactly like "this crop
// has no data". Every shape below was read off real responses, not the
// spec.
//
// `message` is worth keeping: CEDA answers 200 with "No data exists"
// rather than 404 when a query is valid but empty.
// =====================================================================

/** Pulls `data` out of the `output` envelope, tolerating either shape. */
function unwrap(body) {
  if (!body) return { rows: [], message: "" };

  const output = body.output || body;
  const rows = Array.isArray(output.data) ? output.data : [];

  return { rows, message: output.message || "" };
}

/** CEDA sends "2024-01-01T00:00:00.000Z"; charts and filters want "2024-01-01". */
function toIsoDay(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

// ---------------------------------------------------------------------
// CACHING
// ---------------------------------------------------------------------
// The commodity list and the geography list are effectively static -
// India does not gain a district on a Tuesday. Fetching them on every
// page load would waste a round trip and eat into a rate limit that the
// API documents (it returns 429 when exceeded).
//
// Prices are NOT cached here: they are per crop, per place, per date
// range, so the hit rate would be poor and the memory cost high.
// ---------------------------------------------------------------------
const REFERENCE_CACHE_MS = 24 * 60 * 60 * 1000; // a day
const FAILED_CACHE_MS = 2 * 60 * 1000; // retry a failure within 2 minutes

const cache = {
  commodities: { data: null, fetchedAt: 0, lifetime: 0 },
  geographies: { data: null, fetchedAt: 0, lifetime: 0 },
};

function isFresh(entry) {
  return entry.data && Date.now() - entry.fetchedAt < entry.lifetime;
}

function store(entry, data, ok, key) {
  entry.data = data;
  entry.fetchedAt = Date.now();
  entry.lifetime = ok ? REFERENCE_CACHE_MS : FAILED_CACHE_MS;

  // Also write it where a restart cannot lose it. These two lists -
  // 453 commodities and every state/district CEDA knows - change maybe
  // once a season, but the in-memory copy dies with the process, so on
  // a host that sleeps they were being re-fetched constantly.
  //
  // Not awaited: the caller already has the data.
  if (key && ok) writeCache(key, data, entry.lifetime);
}

/**
 * Fills an in-memory entry from the database, if there is a fresh row.
 *
 * Called before an upstream fetch, so a cold start reads one document
 * instead of making a network round trip to CEDA - which also matters
 * because CEDA allows only 40 requests an hour.
 */
async function hydrate(entry, key) {
  if (isFresh(entry)) return true;

  const stored = await readCache(key);
  if (!stored) return false;

  entry.data = stored.payload;
  entry.fetchedAt = new Date(stored.fetchedAt).getTime();
  entry.lifetime = REFERENCE_CACHE_MS;
  console.log(`📦 CEDA ${key} served from the database`);
  return true;
}

// ---------------------------------------------------------------------
// THE KEY
// ---------------------------------------------------------------------

/** True when a CEDA key is configured. Routes use this to answer helpfully. */
function isConfigured() {
  return Boolean(process.env.CEDA_API_KEY && process.env.CEDA_API_KEY.trim());
}

/**
 * Builds the request headers.
 *
 * Confirmed from the OpenAPI spec rather than guessed:
 *
 *     "securitySchemes": { "bearerAuth": { "type": "http", "scheme": "bearer" } }
 *
 * `type: http` + `scheme: bearer` is precisely "Authorization: Bearer
 * <token>". Not an x-api-key header, and not a query parameter - both of
 * which would have been reasonable guesses and both wrong.
 */
function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.CEDA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------
// THE REQUEST, WITH RETRIES
// ---------------------------------------------------------------------

/** A tiny sleep, so backoff does not need a library. */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================================
// THE RATE LIMIT - 40 REQUESTS PER HOUR
// =====================================================================
// CEDA sends this with every response:
//
//     ratelimit-policy: 40;w=3600
//     ratelimit-remaining: 0
//     ratelimit-reset: 1556
//     retry-after: 1556
//
// Forty an hour is a small budget, and it is shared by everyone using
// this key. Roughly one request every 90 seconds. So the cost of a call
// matters far more here than with a normal API, and three things guard
// it:
//
//   1. We REMEMBER what CEDA tells us. Once remaining hits 0 we stop
//      calling until the reset time, and fail immediately with a
//      message saying when it clears. Calling anyway just earns another
//      429 and tells us nothing we did not already know.
//
//   2. Identical calls in flight at the same moment SHARE one request.
//      Two browser tabs opening the crops page used to be two requests;
//      now the second waits on the first. (This was visible in the
//      logs - the same endpoint retrying twice in parallel.)
//
//   3. Price answers are CACHED. Historical prices never change: what
//      Onion cost in Nashik in October 2025 is settled. So the same
//      query never needs asking twice.
// =====================================================================

const rateLimit = {
  remaining: null, // null = we have not been told yet
  resetAt: 0, // epoch ms when the window rolls over
  policy: "",
};

/** Learn the budget from any response, successful or not. */
function noteRateLimit(headers) {
  if (!headers) return;

  const remaining = Number(headers["ratelimit-remaining"]);
  if (Number.isFinite(remaining)) rateLimit.remaining = remaining;

  const resetSeconds = Number(headers["ratelimit-reset"]);
  if (Number.isFinite(resetSeconds)) {
    rateLimit.resetAt = Date.now() + resetSeconds * 1000;
  }

  if (headers["ratelimit-policy"]) rateLimit.policy = headers["ratelimit-policy"];
}

function isBudgetExhausted() {
  return rateLimit.remaining === 0 && Date.now() < rateLimit.resetAt;
}

function minutesUntilReset() {
  return Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 60000));
}

/** What the app can show a user about the budget. */
function getRateLimitStatus() {
  return {
    remaining: rateLimit.remaining,
    policy: rateLimit.policy,
    resetAt: rateLimit.resetAt || null,
    minutesUntilReset: rateLimit.resetAt > Date.now() ? minutesUntilReset() : 0,
    exhausted: isBudgetExhausted(),
  };
}

// The longest we will ever sleep INSIDE a request while retrying.
//
// This is the bug that showed up in the dev logs:
//
//     CEDA /agmarknet/commodities failed (429); retry 2/3 in 1627000ms
//
// 1,627,000ms is 27 minutes. The code was honouring Retry-After
// literally, so a page load sat there for half an hour holding a
// connection open instead of failing. Honouring Retry-After is right
// for a few seconds and wrong for half an hour: past this cap we give
// up immediately and say when to come back.
const MAX_RETRY_DELAY_MS = 10000;

// Requests currently in flight, keyed by what they are asking for, so
// simultaneous identical calls share one upstream request.
const inFlight = new Map();

// Answers to price/quantity queries. Historical data does not change,
// so this can be held for a long time.
const PRICE_CACHE_MS = 24 * 60 * 60 * 1000;
const priceCache = new Map();

/** Keeps the price cache from growing without limit. */
function rememberPrice(key, value) {
  // Oldest out first. 200 entries is plenty for one session and costs
  // little memory.
  if (priceCache.size >= 200) {
    priceCache.delete(priceCache.keys().next().value);
  }
  priceCache.set(key, { value, at: Date.now() });
}

function recallPrice(key) {
  const hit = priceCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > PRICE_CACHE_MS) {
    priceCache.delete(key);
    return null;
  }
  return hit.value;
}

/**
 * Should this failure be retried?
 *
 * Retry:  a network error, a timeout, a 5xx, or a 429.
 * Do NOT retry: 400 or 401. A malformed body or a bad key will fail
 * exactly the same way the second time, so retrying only delays the
 * error message and doubles the load.
 */
function isRetryable(error) {
  if (!error.response) return true; // network error / timeout
  const status = error.response.status;
  return status === 429 || status >= 500;
}

/**
 * One call to CEDA, retried with exponential backoff.
 *
 * ON 429 SPECIFICALLY: the API documents a rate limit. If it sends a
 * Retry-After header we wait exactly that long, because guessing shorter
 * is how you get yourself blocked for longer.
 */
async function callCeda(method, path, body = null, attempt = 1) {
  const MAX_ATTEMPTS = 3;

  if (!isConfigured()) {
    const error = new Error(
      "CEDA_API_KEY is not set in backend/.env - the crop trend pages need it."
    );
    error.code = "CEDA_NOT_CONFIGURED";
    throw error;
  }

  // ---- Do not spend a request we know we do not have ----
  if (isBudgetExhausted()) {
    const error = new Error(
      `CEDA's hourly limit (${rateLimit.policy || "40 requests/hour"}) is used up. ` +
        `It resets in about ${minutesUntilReset()} minutes.`
    );
    error.status = 429;
    error.code = "CEDA_RATE_LIMITED";
    error.minutesUntilReset = minutesUntilReset();
    throw error;
  }

  // ---- Share a request that is already on its way ----
  // Only for the first attempt; a retry is already inside a shared call.
  const key = `${method} ${path} ${body ? JSON.stringify(body) : ""}`;
  if (attempt === 1 && inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    try {
      const response = await axios({
        method,
        url: `${BASE_URL}${path}`,
        headers: authHeaders(),
        data: body || undefined,
        timeout: REQUEST_TIMEOUT_MS,
      });

      noteRateLimit(response.headers);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      noteRateLimit(error.response?.headers);

      if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
        const retryAfter = Number(error.response?.headers?.["retry-after"]);
        const wanted =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : attempt * 1000;

        // A wait longer than the cap is not a retry, it is a hang. Stop
        // and tell the caller when to come back instead.
        if (wanted > MAX_RETRY_DELAY_MS) {
          const giveUp = new Error(
            `CEDA's hourly limit (${rateLimit.policy || "40 requests/hour"}) is used up. ` +
              `It resets in about ${Math.max(1, Math.ceil(wanted / 60000))} minutes.`
          );
          giveUp.status = status || 429;
          giveUp.code = "CEDA_RATE_LIMITED";
          giveUp.minutesUntilReset = Math.max(1, Math.ceil(wanted / 60000));
          throw giveUp;
        }

        console.warn(
          `⚠️  CEDA ${path} failed (${status || error.code}); retry ${attempt + 1}/${MAX_ATTEMPTS} in ${wanted}ms`
        );
        await wait(wanted);
        return callCeda(method, path, body, attempt + 1);
      }

    // Out of retries, or not worth retrying. Re-throw with a message
    // that says what actually happened, because "Request failed with
    // status code 401" in a log helps nobody.
      const friendly = new Error(
        status === 401
          ? "CEDA rejected the API key. Check CEDA_API_KEY in backend/.env."
          : status === 429
          ? `CEDA's hourly limit is used up. It resets in about ${minutesUntilReset()} minutes.`
          : status === 400
          ? `CEDA rejected the request: ${JSON.stringify(error.response?.data || {}).slice(0, 200)}`
          : `Could not reach CEDA (${status || error.code}).`
      );
      friendly.status = status;
      friendly.code = status === 429 ? "CEDA_RATE_LIMITED" : error.code;
      throw friendly;
    }
  })();

  if (attempt === 1) {
    inFlight.set(key, promise);

    // Clear the slot however it ends, or a single failure would be
    // handed to every future caller for the life of the process.
    //
    // The trailing .catch() is not optional. `.finally()` returns a NEW
    // promise that settles the same way as this one - so when the call
    // fails, that derived promise rejects with nobody listening, and
    // Node reports an unhandled rejection. The real caller is handling
    // the original `promise` perfectly well; this branch just needs to
    // say "I know, and I am only here to tidy up".
    promise.finally(() => inFlight.delete(key)).catch(() => {});
  }

  return promise;
}

// =====================================================================
// 1. COMMODITIES  -  GET /agmarknet/commodities
// =====================================================================

/**
 * Every crop CEDA knows about.
 *
 * @returns {Promise<Array<{id:number, name:string}>>}
 */
async function getCommodities() {
  if (isFresh(cache.commodities)) return cache.commodities.data;

  // Memory is empty - try the database before the network.
  if (await hydrate(cache.commodities, KEYS.CEDA_CROPS)) {
    return cache.commodities.data;
  }

  try {
    const body = await callCeda("get", "/agmarknet/commodities");

    // REAL shape: { output: { data: [ { commodity_id, commodity_name } ] } }
    // Normalised to { id, name } so the rest of the app does not have to
    // care what CEDA calls its columns.
    const { rows } = unwrap(body);
    const commodities = rows
      .filter((c) => c && c.commodity_name)
      .map((c) => ({ id: c.commodity_id, name: String(c.commodity_name).trim() }));

    store(cache.commodities, commodities, true, KEYS.CEDA_CROPS);
    console.log(`✅ CEDA: ${commodities.length} commodities loaded`);
    return commodities;
  } catch (error) {
    // A stale-but-real list beats an error page. Only fall back to
    // nothing if we never had one.
    if (cache.commodities.data) {
      console.warn("⚠️  CEDA commodities failed - serving the cached list.");
      cache.commodities.fetchedAt = Date.now();
      // Retrying a rate-limited call every 2 minutes just burns the
      // budget on 429s. Wait out the window instead.
      cache.commodities.lifetime =
        error.code === "CEDA_RATE_LIMITED"
          ? Math.max(FAILED_CACHE_MS, minutesUntilReset() * 60 * 1000)
          : FAILED_CACHE_MS;
      return cache.commodities.data;
    }
    throw error;
  }
}

// =====================================================================
// 2. GEOGRAPHIES  -  GET /agmarknet/geographies
// =====================================================================

/**
 * Every state, each with its districts.
 *
 * @returns {Promise<Array<{state_id, state_name, districts:[{district_id, district_name}]}>>}
 */
async function getGeographies() {
  if (isFresh(cache.geographies)) return cache.geographies.data;

  if (await hydrate(cache.geographies, KEYS.CEDA_GEOGRAPHIES)) {
    return cache.geographies.data;
  }

  try {
    const body = await callCeda("get", "/agmarknet/geographies");

    // REAL shape: a FLAT list of state-district pairs -
    //   { output: { data: [ { census_state_id, census_state_name,
    //                         census_district_id, census_district_name } ] } }
    //
    // The spec claims districts are nested inside each state. They are
    // not. We build that nesting here, once, because every caller wants
    // "states, each with its districts" and nobody wants to group a
    // 700-row flat list themselves.
    const { rows } = unwrap(body);

    const byState = new Map();
    for (const row of rows) {
      if (!row || !row.census_state_name) continue;

      if (!byState.has(row.census_state_id)) {
        byState.set(row.census_state_id, {
          state_id: row.census_state_id,
          state_name: String(row.census_state_name).trim(),
          districts: [],
        });
      }

      if (row.census_district_id != null) {
        byState.get(row.census_state_id).districts.push({
          district_id: row.census_district_id,
          district_name: String(row.census_district_name || "").trim(),
        });
      }
    }

    const geographies = [...byState.values()].sort((a, b) =>
      a.state_name.localeCompare(b.state_name)
    );
    for (const state of geographies) {
      state.districts.sort((a, b) => a.district_name.localeCompare(b.district_name));
    }

    store(cache.geographies, geographies, true, KEYS.CEDA_GEOGRAPHIES);
    console.log(`✅ CEDA: ${geographies.length} states loaded`);
    return geographies;
  } catch (error) {
    if (cache.geographies.data) {
      console.warn("⚠️  CEDA geographies failed - serving the cached list.");
      cache.geographies.fetchedAt = Date.now();
      cache.geographies.lifetime =
        error.code === "CEDA_RATE_LIMITED"
          ? Math.max(FAILED_CACHE_MS, minutesUntilReset() * 60 * 1000)
          : FAILED_CACHE_MS;
      return cache.geographies.data;
    }
    throw error;
  }
}

// =====================================================================
// 3. MARKETS  -  POST /agmarknet/markets
// =====================================================================

/**
 * The mandis for one commodity in one district.
 *
 * NOTE `indicator` is REQUIRED and must be "price" or "quantity". It is
 * easy to miss - it is not in the obvious list of geography fields, and
 * leaving it out gets a 400.
 */
async function getMarkets({ commodityId, stateId, districtId, indicator = "price" }) {
  const body = await callCeda("post", "/agmarknet/markets", {
    commodity_id: Number(commodityId),
    state_id: Number(stateId),
    district_id: Number(districtId),
    indicator,
  });

  // { output: { data: [ { census_state_id, census_district_id,
  //                        market_id, market_name } ] } }
  const { rows } = unwrap(body);
  return rows;
}

// =====================================================================
// 4. PRICES  -  POST /agmarknet/prices
// =====================================================================

/**
 * Raw price rows for a crop over a date range.
 *
 * Read the "no level parameter" note at the top of this file before
 * changing anything here: the level is decided by which of stateId /
 * districtIds / marketIds you pass, and stateId 0 means all India.
 *
 * @param {object} options
 * @param {number} options.commodityId
 * @param {number} options.stateId       - 0 for all India
 * @param {number[]} [options.districtIds] - omit for national/state level
 * @param {number[]} [options.marketIds]   - omit for district level
 * @param {string} options.fromDate      - "YYYY-MM-DD"
 * @param {string} options.toDate        - "YYYY-MM-DD"
 * @returns {Promise<Array<{date, min_price, max_price, modal_price, ...}>>}
 */
async function getPrices({ commodityId, stateId, districtIds, marketIds, fromDate, toDate }) {
  const payload = {
    commodity_id: Number(commodityId),
    state_id: Number(stateId), // 0 = all India
    from_date: fromDate,
    to_date: toDate,
  };

  // Only SEND these when we have them. Sending an empty array is not the
  // same as omitting the field - per the spec, the presence of
  // district_id is what selects district-level data, so an empty array
  // risks asking for "district level, no districts".
  if (Array.isArray(districtIds) && districtIds.length > 0) {
    payload.district_id = districtIds.map(Number);
  }
  if (Array.isArray(marketIds) && marketIds.length > 0) {
    payload.market_id = marketIds.map(Number);
  }

  // Historical prices are settled facts - what Onion cost in Nashik last
  // October will not change. With only 40 requests an hour to spend,
  // asking twice is a waste we cannot afford.
  const cacheKey = `prices ${JSON.stringify(payload)}`;
  const cached = recallPrice(cacheKey);
  if (cached) return cached;

  const body = await callCeda("post", "/agmarknet/prices", payload);

  // Rows look like:
  //   { date: "2024-01-01T00:00:00.000Z", commodity_id, census_state_id,
  //     census_district_id?, market_id?, min_price, max_price, modal_price }
  //
  // HOW MANY ROWS COME BACK DEPENDS ON THE LEVEL, which matters for the
  // averaging done further up:
  //   national / state  -> ONE row per date, already aggregated by CEDA
  //   district / market -> one row per MARKET per date (a 10-day Nashik
  //                        query returns 144 rows across ~14 markets)
  const { rows, message } = unwrap(body);

  const prices = rows.map((row) => ({ ...row, date: toIsoDay(row.date) }));

  // CEDA answered. Fire-and-forget bookkeeping, same as the government
  // feed - see services/syncStatusService.js.
  recordSuccessfulSync(SOURCES.CEDA, prices.length);

  // CEDA answers 200 with "No data exists" instead of 404. Passing the
  // message up lets the caller tell "nothing here" apart from "broken".
  prices.message = message;

  rememberPrice(cacheKey, prices);
  return prices;
}

// =====================================================================
// 5. QUANTITIES  -  POST /agmarknet/quantities
// =====================================================================

/**
 * Arrival quantities, same shape of request as prices.
 *
 * Worth knowing this exists: the data.gov.in feed has no quantity field
 * at all, so "how much arrived?" was previously unanswerable. CEDA
 * publishes it.
 *
 * @returns {Promise<Array<{date, quantity, ...}>>}
 */
async function getQuantities({ commodityId, stateId, districtIds, marketIds, fromDate, toDate }) {
  const payload = {
    commodity_id: Number(commodityId),
    state_id: Number(stateId),
    from_date: fromDate,
    to_date: toDate,
  };

  if (Array.isArray(districtIds) && districtIds.length > 0) {
    payload.district_id = districtIds.map(Number);
  }
  if (Array.isArray(marketIds) && marketIds.length > 0) {
    payload.market_id = marketIds.map(Number);
  }

  const cacheKey = `quantities ${JSON.stringify(payload)}`;
  const cached = recallPrice(cacheKey);
  if (cached) return cached;

  const body = await callCeda("post", "/agmarknet/quantities", payload);

  const { rows, message } = unwrap(body);
  const quantities = rows.map((row) => ({ ...row, date: toIsoDay(row.date) }));
  quantities.message = message;

  rememberPrice(cacheKey, quantities);
  return quantities;
}

// =====================================================================
// NAME -> ID LOOKUPS
// =====================================================================
// The app knows "Onion" and "Maharashtra"; CEDA wants 23 and 27. These
// translate, using the cached reference lists.

/** Case-insensitive, whitespace-tolerant comparison of two names. */
function sameName(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

/** "Onion" -> { id, name }, or null if CEDA has no such crop. */
async function findCommodity(name) {
  const commodities = await getCommodities();

  // Exact match first, so "Onion" never loses to "Onion Green".
  const exact = commodities.find((c) => sameName(c.name, name));
  if (exact) return exact;

  const needle = String(name || "").trim().toLowerCase();
  if (!needle) return null;

  return commodities.find((c) => String(c.name).toLowerCase().includes(needle)) || null;
}

/** "Maharashtra" -> the geography entry, or null. */
async function findState(name) {
  const geographies = await getGeographies();
  return geographies.find((g) => sameName(g.state_name, name)) || null;
}

/**
 * "Nashik" -> { state, district }, searching every state.
 *
 * Both are returned because CEDA needs the STATE id as well as the
 * district id - district_id alone is not enough to identify a place.
 */
async function findDistrict(name, stateName = "") {
  const geographies = await getGeographies();

  const statesToSearch = stateName
    ? geographies.filter((g) => sameName(g.state_name, stateName))
    : geographies;

  for (const state of statesToSearch) {
    const district = (state.districts || []).find((d) => sameName(d.district_name, name));
    if (district) return { state, district };
  }

  return null;
}

module.exports = {
  isConfigured,
  getRateLimitStatus,
  toIsoDay,
  getCommodities,
  getGeographies,
  getMarkets,
  getPrices,
  getQuantities,
  findCommodity,
  findState,
  findDistrict,
};
