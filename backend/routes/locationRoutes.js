// routes/locationRoutes.js
// -----------------------------------------------------------------------
// Turning a pincode, an address, a lat/lon pair or a town name into one
// set of coordinates.
//
//   GET /api/location/resolve
//
// Same shape as the other route files: protect first, so every route
// below needs a logged-in user.
// -----------------------------------------------------------------------

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { resolveLocation } = require("../controllers/locationController");

router.use(protect);

// Pincode and address lookups reach outside our server - India Post and
// Nominatim respectively - and Nominatim's fair-use policy is one
// request a second. This keeps one impatient user from spending that
// budget for everybody.
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many location lookups. Please wait a few seconds." },
});

router.get("/resolve", lookupLimiter, resolveLocation);

module.exports = router;
