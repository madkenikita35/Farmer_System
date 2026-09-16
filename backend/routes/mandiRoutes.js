// routes/mandiRoutes.js
// -----------------------------------------------------------------------
// Like adminRoutes.js, this file uses `router.use(protect)` at the top
// so EVERY mandi route below needs a logged-in user. A farmer or an
// admin can use these - they're not admin-only - but a logged-out
// visitor gets a 401 and sees nothing.
// -----------------------------------------------------------------------

const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const {
  getPricesByCrop,
  comparePrices,
  listMandis,
  getMandiCrops,
} = require("../controllers/mandiController");
const { getNearbyMandis } = require("../controllers/nearbyController");

// 🔒 Must be logged in (as either a farmer or an admin) for everything below.
router.use(protect);

// GET /api/mandi/prices?crop=Wheat
// Government prices only - simple lookup.
router.get("/prices", getPricesByCrop);

// GET /api/mandi/compare?crop=Wheat&state=Maharashtra&date=2026-09-15
// Government prices AND community (other-farmers) prices together,
// plus which mandi is paying the most/least - powers the
// "Check Rates Before Selling" page.
router.get("/compare", comparePrices);

// GET /api/mandi/list?search=pune&state=Maharashtra
// The mandi directory: total registered count + a searchable list.
router.get("/list", listMandis);

// GET /api/mandi/crops?mandi=Pune&state=Maharashtra
// Every crop sold in one mandi, with both data sources' prices.
router.get("/crops", getMandiCrops);

// GET /api/mandi/nearby?crop=Onion&lat=19.99&lon=73.78
// GET /api/mandi/nearby?crop=Onion&place=Nashik
// Mandis NEAR the farmer, ranked by who pays the most - see
// controllers/nearbyController.js.
router.get("/nearby", getNearbyMandis);

module.exports = router;
