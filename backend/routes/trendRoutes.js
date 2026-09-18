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
router.use(protect);

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
