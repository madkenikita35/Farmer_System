// routes/voiceRoutes.js
// -----------------------------------------------------------------------
// The voice assistant's one endpoint.
//
// Like every other farmer-facing route, it sits behind `protect` - a
// spoken question returns the same mandi data a typed one would, so it
// needs the same login.
// -----------------------------------------------------------------------

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { protect } = require("../middleware/auth");
const { handleVoiceQuery } = require("../controllers/voiceController");

// 🔒 Must be logged in.
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

// A conversation is chatty by nature - several turns a minute is normal -
// but each turn costs us a government API call, so it still needs a
// ceiling. 60/minute is far more than a person can speak, and well under
// anything that would hammer data.gov.in.
const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many voice requests. Please wait a moment." },
});

// POST /api/voice/query
// Body: { transcript, language, confidence, lat?, lon?, context? }
router.post("/query", voiceLimiter, handleVoiceQuery);

module.exports = router;
