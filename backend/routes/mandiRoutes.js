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
  getCropCoverageChart,
  listCropNames,
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

// GET /api/mandi/crop-coverage - how many mandis list each crop today.
// Feeds the "most listed / least listed" charts on the Mandis page.
router.get("/crop-coverage", getCropCoverageChart);

// GET /api/mandi/crop-names - the crop names the government feed
// carries today, for the crop dropdowns on Near Me and Check Rates.
//
// NOT "/crops": that path is already taken by getMandiCrops above,
// which lists the crops in ONE mandi and needs a ?mandi= parameter.
// Express matches routes in declaration order, so a second "/crops"
// here was simply never reached - every call fell into the first
// handler and came back 400 "no mandi specified".
router.get("/crop-names", listCropNames);

// GET /api/mandi/nearby?crop=Onion&lat=19.99&lon=73.78
// GET /api/mandi/nearby?crop=Onion&place=Nashik
// Mandis NEAR the farmer, ranked by who pays the most - see
// controllers/nearbyController.js.
router.get("/nearby", getNearbyMandis);

module.exports = router;
