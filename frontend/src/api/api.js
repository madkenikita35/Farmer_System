// api/api.js
// -----------------------------------------------------------------------
// EVERY network call the frontend makes to our backend goes through this
// one file. Why bother? If the backend URL ever changes, or you want to
// add error-logging, you only change it HERE instead of in every page.
//
// This file now also handles the LOGIN TOKEN automatically - see the
// "interceptors" section below, which is the most important part.
// -----------------------------------------------------------------------

import axios from "axios";

// The backend server's address.
//
// In development this is localhost:5000, which is why that is the
// fallback. In production the backend lives on a completely different
// host, so the URL has to come from the ENVIRONMENT rather than being
// written here - a deployed build that says "localhost" is asking the
// browser to call the user's OWN machine, which fails for everyone.
//
// Vite only exposes variables whose name starts with VITE_, and it
// substitutes them AT BUILD TIME, not when the page runs. So this must
// be set before `npm run build` - changing it on the host afterwards
// does nothing until the site is rebuilt.
//
//   local:  create frontend/.env with
//             VITE_API_URL=http://localhost:5000/api
//   hosted: set VITE_API_URL in the host's environment variables, e.g.
//             VITE_API_URL=https://farmer-system-1-mm8g.onrender.com/api
//
// Note the trailing "/api" - every path in this file is written
// relative to it ("/auth/login", not "/api/auth/login").
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,

  // Send cookies with every request. This is what carries the HttpOnly
  // refresh-token cookie to /auth/refresh and /auth/logout. Without it
  // the browser would simply leave the cookie behind and the user would
  // be logged out on every page refresh.
  withCredentials: true,
});

// =======================================================================
// THE ACCESS TOKEN - IN MEMORY ONLY
// =======================================================================
// This used to be `localStorage.setItem("mandi_token", ...)`.
//
// WHY THAT WAS A PROBLEM
// localStorage is readable by ANY JavaScript running on the page. One
// XSS bug - in our code, or in any npm package we pull in - and the
// attacker reads the token and is that farmer for the next seven days.
// The token also survived closing the browser, so it sat on disk.
//
// WHAT WE DO INSTEAD
// The access token now lives in the plain variable below. Facts about
// a plain variable that make this safer:
//
//   - It is NOT in localStorage or sessionStorage, so nothing on disk.
//   - It vanishes when the tab closes or reloads.
//   - It expires in 15 minutes rather than 7 days.
//
// "But it reloads away - does the farmer get logged out?" No. On load
// the app calls /auth/refresh, and the HttpOnly cookie (which JS cannot
// read, and therefore XSS cannot steal) mints a fresh access token.
// See AuthContext.jsx.
//
// This variable is module-level, so every import of api.js shares the
// one value - it behaves like a tiny store.
// =======================================================================

let accessTokenInMemory = null;

export function setAccessToken(token) {
  accessTokenInMemory = token || null;
}

export function getAccessToken() {
  return accessTokenInMemory;
}

export function clearAccessToken() {
  accessTokenInMemory = null;
}

// ---------------------------------------------------------------------
// Clearing out the OLD storage.
//
// Anyone who used the app before this change still has a token and a
// full user record (name, email, phone, role) sitting in their browser
// from the previous version. Removing the code that WRITES them does
// not remove what is already there - it would sit on their disk
// indefinitely. So we delete it once, on startup.
//
// The second group are keys from an unrelated app that was served on
// this same localhost port during development. localStorage is shared
// per ORIGIN, not per project, so they show up in this app's dev-tools
// too. They are not ours and nothing here reads them, but they hold
// real-looking names and emails, so they are cleared as well.
// ---------------------------------------------------------------------
const LEGACY_KEYS = [
  // ours, from before this refactor
  "mandi_token",
  "mandi_current_user",
  // another app that shared this dev origin
  "token",
  "user",
  "role",
  "username",
  "auth_session",
  "custom_employees",
  "portalLang",
];

export function purgeLegacyStorage() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      // Private mode / blocked storage. Nothing to clean up, carry on.
    }
  }
}

// ---- REQUEST interceptor: runs before every request goes out ----
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =======================================================================
// RESPONSE interceptor: silently renew an expired access token
// =======================================================================
// Access tokens now last 15 minutes, so a farmer with the app open will
// hit an expired one during normal use. They must not see that.
//
// On a 401 we call /auth/refresh ONCE and replay the original request
// with the new token. Only if the refresh ALSO fails do we treat the
// session as over and send them to the login page.
//
// `isRefreshing` + `waitingRequests` handle the case where several
// requests fail at the same moment (a dashboard firing three calls at
// once). Without them each would trigger its own refresh, and since
// refresh tokens are single-use, the first would rotate the token and
// the other two would fail with a token that had just been burned -
// logging the user out for no reason. Instead the first one refreshes
// and the rest queue up behind it.
// =======================================================================

let isRefreshing = false;
let waitingRequests = [];

function onRefreshed(token) {
  waitingRequests.forEach((callback) => callback(token));
  waitingRequests = [];
}

// A bare axios (not `api`) so this one call cannot be intercepted by
// the very interceptor we are inside - that would recurse forever.
function requestNewAccessToken() {
  return axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
}

api.interceptors.response.use(
  (response) => response, // success - pass it straight through
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Not an auth problem, or we already retried this one - give up.
    if (status !== 401 || !originalRequest || originalRequest._alreadyRetried) {
      return Promise.reject(error);
    }

    // Never try to refresh a failed refresh or a failed login. Doing so
    // would loop, and a 401 from those genuinely means "not logged in".
    const url = originalRequest.url || "";
    if (url.includes("/auth/refresh") || url.includes("/auth/login")) {
      handleSessionEnded();
      return Promise.reject(error);
    }

    originalRequest._alreadyRetried = true;

    // A refresh is already in flight - wait for it rather than starting
    // a second one (see the note above about single-use tokens).
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingRequests.push((token) => {
          if (!token) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const response = await requestNewAccessToken();
      const newToken = response.data.accessToken;

      setAccessToken(newToken);
      onRefreshed(newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // The refresh cookie is gone, expired, or already spent. This is
      // a real logout.
      onRefreshed(null);
      handleSessionEnded();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Who to tell when a session ends. AuthContext registers itself here at
// startup, so this module can clear the app's auth state without
// importing React or knowing that AuthContext exists.
let sessionEndedListener = null;

export function onSessionEnded(callback) {
  sessionEndedListener = callback;
}

/**
 * Forget the local session.
 *
 * ---------------------------------------------------------------------
 * WHY THIS NO LONGER REDIRECTS
 * ---------------------------------------------------------------------
 * It used to do `window.location.href = "/login"`, which was right when
 * every page required an account: a 401 meant you had been thrown out,
 * so the login page was where you belonged.
 *
 * That became a bug the moment guests could browse. On startup
 * AuthContext calls /auth/refresh to see whether anyone is signed in. A
 * visitor with no cookie gets a perfectly normal 401 - "nobody is
 * logged in" - and this function bounced them from the home page they
 * had just opened to a login screen they never asked for.
 *
 * Now it clears the session and tells AuthContext, and React decides
 * what to show: the public pages stay public, and the two account-only
 * pages render SignInPrompt in place. Nobody loses the page they were
 * on, which is also what a real session expiry should feel like.
 */
function handleSessionEnded() {
  clearAccessToken();
  purgeLegacyStorage();

  if (sessionEndedListener) sessionEndedListener();
}

// =======================================================================
// AUTH CALLS
// =======================================================================

// Creates a new FARMER account. (The backend always makes signups
// farmers - admin accounts come from the .env seed. See authController.)
export function signupRequest({ name, email, password, phone, state }) {
  return api.post("/auth/signup", { name, email, password, phone, state });
}

// Logs in. The response includes `user.role`, which the AuthContext
// uses to decide whether to open the farmer site or the admin site.
export function loginRequest({ email, password }) {
  return api.post("/auth/login", { email, password });
}

// "Who am I?" - called on page load to check a saved token is still
// valid, and to re-fetch the user's real role from the server.
export function getMeRequest() {
  return api.get("/auth/me");
}

// Tells the backend we logged out (so it shows in the admin's activity
// feed). The actual "forgetting" happens in the browser.
// Swaps the HttpOnly refresh cookie for a new short-lived access
// token. Called once when the app loads, and automatically by the
// interceptor above whenever an access token expires mid-session.
export function refreshRequest() {
  return api.post("/auth/refresh");
}

// Ends every session this user has, on every device.
export function logoutEverywhereRequest() {
  return api.post("/auth/logout-all");
}

export function logoutRequest() {
  return api.post("/auth/logout");
}

// =======================================================================
// RECEIPT CALLS
// =======================================================================

// Uploads an image file and asks the backend to OCR-scan it.
export function scanReceiptImage(file) {
  const formData = new FormData();
  formData.append("receiptImage", file);
  return api.post("/receipts/scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

// Saves the final, user-confirmed receipt details.
export function saveReceipt(receiptData) {
  return api.post("/receipts", receiptData);
}

// Gets the list of saved receipts. A farmer gets their OWN receipts;
// an admin gets everyone's. The backend decides that from the token -
// there's nothing to pass here.
export function getAllReceipts() {
  return api.get("/receipts");
}

// Gets summary numbers + chart data for the dashboard (again, scoped to
// the logged-in user automatically).
export function getDashboardStats() {
  return api.get("/receipts/dashboard-stats");
}

// =======================================================================
// MANDI PRICE LOOKUP (without uploading a receipt)
// =======================================================================

// "date" (optional, "YYYY-MM-DD") lets you check prices for a specific
// day instead of just today - the backend matches it against the real
// government dataset's arrival_date.
export function getMandiPricesByCrop(crop, date) {
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : "";
  return api.get(`/mandi/prices?crop=${encodeURIComponent(crop)}${dateParam}`);
}

// Gets BOTH data sources at once (government + community/other-farmers)
// for a crop, PLUS which mandi is paying the highest and lowest right
// now - powers the "Check Rates Before Selling" page. "state" and
// "date" are both optional.
export function compareMandiPrices(crop, state, date, options = {}) {
  // lat/lon/radius are OPTIONAL. With them the backend also returns
  // `scopes` - the near-you / state / national comparison. Without
  // them it still returns everything it always did, so an older caller
  // is unaffected.
  const { lat, lon, radius } = options;

  return api.get("/mandi/compare", {
    params: {
      crop,
      state,
      date,
      ...(lat != null && lon != null ? { lat, lon } : {}),
      ...(radius != null ? { radius } : {}),
    },
  });
}

// =======================================================================
// MANDI DIRECTORY (browse/search mandis themselves)
// =======================================================================

// The list of registered mandis, with a total count. Both `search` and
// `state` are optional - with neither, you get every mandi.
export function getMandiList(search, state) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (state) params.append("state", state);
  return api.get(`/mandi/list?${params.toString()}`);
}

// Every crop sold in ONE mandi, with the government price AND what our
// own farmers reported paying there.
// How many mandis list each crop today - the data behind the two
// charts on the Mandi Directory page.
//
// NOTE this counts LISTINGS, not arrival quantity. The government price
// feed carries no quantity field, so arrivals cannot be charted from
// it. See the comment in components/CropCoverageCharts.jsx.
// ---------------------------------------------------------------------
// CEDA AGMARKNET  -  real price history
//
// The Centre for Economic Data & Analysis (Ashoka University) serves the
// same Agmarknet data as data.gov.in but WITH HISTORY, which is what
// makes a price trend possible at all. data.gov.in only ever holds a
// single day.
//
// Showing this data obliges us to credit CEDA - see
// components/CedaAttribution.jsx.
// ---------------------------------------------------------------------

// Every crop CEDA knows about (453 of them at the time of writing).
export function getCedaCrops() {
  return api.get("/crops");
}

// States and districts, for the trend page dropdowns.
export function getCedaLocations() {
  return api.get("/locations");
}

// The line itself. `level` is "country", "state" or "city" (a district).
export function getCedaPriceTrend({ cropName, level = "country", location = "", from = "", to = "" }) {
  return api.get(`/crops/${encodeURIComponent(cropName)}/price-trend`, {
    params: { level, location, from, to },
  });
}

// ---------------------------------------------------------------------
// CROP PRICE TRENDS (over time)
//
// These read our own farmers' receipts, not the government feed - the
// feed is a single-day snapshot and has no history to trend. See
// backend/services/priceTrendService.js.
// ---------------------------------------------------------------------

// Every crop we hold price history for, for the /crops list page.
export function getCropsWithTrends() {
  return api.get("/prices/crops");
}

// The line itself: average price per date for one crop.
// `level` is "city" (a mandi), "state", or "country".
export function getPriceTrend({ crop, level = "country", location = "", from = "", to = "" }) {
  return api.get("/prices/trend", {
    params: { crop, level, location, from, to },
  });
}

// The crop names the GOVERNMENT feed carries today, for the crop
// dropdowns. Deliberately not the CEDA list: these pages search
// data.gov.in, and offering a crop it does not carry would give a
// dropdown where some choices silently return nothing.
// Turns a pincode / address / lat-lon / town name into ONE lat-lon.
// The server owns the India Post lookup, the Nominatim throttle and the
// district-coordinate table, so the browser never has to.
export function resolveLocation(params) {
  return api.get("/location/resolve", { params });
}

// When did the price feeds last give us data? Used by the small
// "Data last updated" line under every price table and chart.
export function getSyncStatus() {
  return api.get("/sync-status");
}

// ---------------------------------------------------------------------
// WARM-UP
// ---------------------------------------------------------------------
// The backend is on Render's free tier, which spins the service down
// after about fifteen minutes of no traffic. The next request then pays
// for the whole container starting up - measured at 21.8 SECONDS.
//
// Nothing in our code can make that start-up faster. What it CAN do is
// start it earlier: this fires the cheapest endpoint we have the moment
// the app loads, so the server wakes while someone is still reading the
// home page rather than after they press Search.
//
// Deliberately fire-and-forget. Nothing waits on it, nothing renders
// from it, and a failure is ignored - it exists only for the side
// effect of making the server exist.
export function warmUpBackend() {
  api.get("/sync-status", { timeout: 60000 }).catch(() => {});
}

export function getMandiCropNames() {
  return api.get("/mandi/crop-names");
}

export function getCropCoverage(limit = 10) {
  return api.get("/mandi/crop-coverage", { params: { limit } });
}

export function getMandiCrops(mandi, state) {
  const params = new URLSearchParams({ mandi });
  if (state) params.append("state", state);
  return api.get(`/mandi/crops?${params.toString()}`);
}

// Mandis NEAR the farmer, ranked by who pays the most for a crop.
//
// `location` is either { lat, lon } - straight from the phone's GPS -
// or { place: "Nashik" }, a name the farmer typed. The backend accepts
// whichever it gets; see backend/controllers/nearbyController.js.
export function getNearbyMandis({ crop, lat, lon, place, radius, sortBy, mode }) {
  // `mode` is "sell" (default) or "buy". It decides which end of the
  // price list each card is drawn from - see the backend's
  // pickHeadlineMandis().
  return api.get("/mandi/nearby", {
    params: { crop, lat, lon, place, radius, sortBy, mode },
  });
}

// =======================================================================
// VOICE ASSISTANT
// =======================================================================

// Sends what the farmer said to the backend, which works out the intent,
// looks up the real mandi data and returns a sentence ready to be spoken
// back in the same language.
//
// `context` carries the last crop/intent, which is what lets a follow-up
// like "and what about tomato?" work without repeating the whole question.
export function askVoiceAssistant({ transcript, language, confidence, lat, lon, context }) {
  return api.post("/voice/query", {
    transcript,
    language,
    confidence,
    lat,
    lon,
    context: context || {},
  });
}

// =======================================================================
// ADMIN-ONLY CALLS
// =======================================================================
// If a farmer's browser somehow called these, the backend replies 403 -
// so these being listed here is not a security hole. The real guard is
// `adminOnly` in the backend's middleware/auth.js.

// Summary numbers + chart data for the admin dashboard.
export function getAdminStats() {
  return api.get("/admin/stats");
}

// The searchable, paginated list of enrolled farmers.
export function getAdminFarmers({ search = "", state = "", page = 1 } = {}) {
  const params = new URLSearchParams({ page });
  if (search) params.append("search", search);
  if (state) params.append("state", state);
  return api.get(`/admin/farmers?${params.toString()}`);
}

// One farmer's full profile: their receipts and their activity history.
export function getAdminFarmerDetail(farmerId) {
  return api.get(`/admin/farmers/${farmerId}`);
}

// Block / unblock a farmer's login.
export function toggleFarmerActive(farmerId) {
  return api.patch(`/admin/farmers/${farmerId}/toggle-active`);
}

// The "what have farmers been doing?" feed.
export function getAdminActivity({ action = "", search = "", page = 1 } = {}) {
  const params = new URLSearchParams({ page });
  if (action) params.append("action", action);
  if (search) params.append("search", search);
  return api.get(`/admin/activity?${params.toString()}`);
}

export default api;
