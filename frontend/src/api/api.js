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

// This is the backend server's address. During development, Vite runs
// on port 5173 and our backend runs on port 5000.
const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// =======================================================================
// THE TOKEN - how the backend knows who we are
// =======================================================================
// When you log in, the backend gives us a long string called a "token".
// Every protected API route needs it sent back in a header:
//
//     Authorization: Bearer <token>
//
// We could write that header by hand in every single function below...
// but that's 12 chances to forget one. Instead we use an axios
// "interceptor": a function axios runs automatically on every request,
// just before it's sent. It adds the header once, for everything.
// =======================================================================

// We keep the token in localStorage so it survives a page refresh.
const TOKEN_KEY = "mandi_token";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---- REQUEST interceptor: runs before every request goes out ----
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- RESPONSE interceptor: runs on every response that comes back ----
// If the backend ever replies 401 ("your session expired or is
// invalid"), the sensible thing is to throw away the dead token and
// send the user back to the login page. Doing it here means every page
// in the app gets that behaviour for free.
api.interceptors.response.use(
  (response) => response, // success - pass it straight through
  (error) => {
    if (error.response && error.response.status === 401) {
      clearToken();
      localStorage.removeItem("mandi_current_user");

      // Only redirect if we're not ALREADY on the login page, otherwise
      // we'd bounce the page in a loop while someone is typing.
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    // Re-throw so the page's own catch block still runs and can show
    // a message. Without this line, errors would silently vanish.
    return Promise.reject(error);
  }
);

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
export function compareMandiPrices(crop, state, date) {
  const params = new URLSearchParams({ crop });
  if (state) params.append("state", state);
  if (date) params.append("date", date);
  return api.get(`/mandi/compare?${params.toString()}`);
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
export function getNearbyMandis({ crop, lat, lon, place, radius, sortBy, date }) {
  const params = new URLSearchParams({ crop });

  if (lat !== undefined && lon !== undefined) {
    params.append("lat", lat);
    params.append("lon", lon);
  } else if (place) {
    params.append("place", place);
  }

  if (radius) params.append("radius", radius);
  if (sortBy) params.append("sortBy", sortBy);
  if (date) params.append("date", date);

  return api.get(`/mandi/nearby?${params.toString()}`);
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
