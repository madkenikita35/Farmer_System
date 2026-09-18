// routes/cedaRoutes.js
// -----------------------------------------------------------------------
// The CEDA-powered crop and price-trend routes.
//
// Same shape as the other route files: `router.use(protect)` at the top,
// so every route below needs a logged-in user (farmer or admin).
//
// Mounted at the ROOT of /api in server.js rather than under a prefix,
// because the paths asked for are /api/crops and /api/locations:
//
//   GET /api/crops
//   GET /api/locations
//   GET /api/crops/:cropName/price-trend
// -----------------------------------------------------------------------

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { listCrops, listLocations, getPriceTrend } = require("../controllers/cedaController");

// 🔒 Must be logged in for everything below.
router.use(protect);

// A limit of our own, sized to CEDA's.
//
// CEDA allows 40 requests PER HOUR on this key - `ratelimit-policy:
// 40;w=3600` - shared by everyone using the app. That is roughly one
// request every 90 seconds.
//
// The first version of this allowed 30 a MINUTE, which could burn the
// whole hourly budget in about 90 seconds and lock every user out for
// the rest of the hour. This window matches the upstream one so a
// single impatient user cannot spend everyone else's quota.
//
// Cached answers never reach here, so normal browsing is unaffected:
// the limit only counts requests that would actually hit CEDA.
const trendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // one hour, same as CEDA's window
  max: 25, // leaves headroom for /crops and /locations
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "You have made a lot of price lookups this hour. The data service allows only 40 per hour, so please wait a little before trying again.",
  },
});

// GET /api/crops - every crop CEDA knows, for the crops list page.
router.get("/crops", listCrops);

// GET /api/locations - states + districts, for the dropdowns.
router.get("/locations", listLocations);

// GET /api/crops/:cropName/price-trend?level=city|state|country
//                                     &location=Nashik&from=&to=
//
// Declared AFTER /crops so the literal path wins; Express matches in
// order, and a route this specific could otherwise be shadowed.
router.get("/crops/:cropName/price-trend", trendLimiter, getPriceTrend);

module.exports = router;
