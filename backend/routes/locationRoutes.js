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
