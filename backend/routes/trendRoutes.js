// routes/trendRoutes.js
// -----------------------------------------------------------------------
// The crop price-trend endpoints. Same shape as mandiRoutes.js:
// `router.use(protect)` at the top, so everything below needs a
// logged-in user (farmer or admin - these are not admin-only).
//
//   GET /api/prices/crops   - every crop we hold priced receipts for
//   GET /api/prices/trend   - average price per date, for one crop
// -----------------------------------------------------------------------

const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { listCropsWithTrends, getTrend } = require("../controllers/trendController");

// 🔒 Must be logged in for everything below.
// PUBLIC. No `router.use(protect)` here on purpose.
//
// Everything below reads price data that the government already
// publishes - mandi lists, today's rates, price history. A farmer
// standing in a field deciding where to sell should not have to make an
// account first, and there is nothing here that belongs to any one
// user.
//
// The guard stayed on everything that WRITES, or that returns one
// person's own data: see receiptRoutes.js, adminRoutes.js and the
// /me, /logout and /refresh routes in authRoutes.js.

// GET /api/prices/crops
// The crops list page. No parameters - it returns everything we have.
router.get("/crops", listCropsWithTrends);

// GET /api/prices/trend?crop=Onion&level=state&location=Maharashtra
//                      &from=2026-06-01&to=2026-09-01
//
// `level` is one of country | state | mandi | city ("city" is an alias
// for mandi - this data has no city field). Returns the points sorted
// by date, plus the mandi/state lists for the dropdowns.
router.get("/trend", getTrend);

module.exports = router;
