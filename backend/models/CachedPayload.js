// models/CachedPayload.js
// -----------------------------------------------------------------------
// A cache that survives the server restarting.
//
// ---------------------------------------------------------------------
// THE PROBLEM THIS SOLVES
// ---------------------------------------------------------------------
// The expensive calls - building the mandi directory, listing CEDA's
// crops - are already cached in memory, and that works beautifully while
// the server stays up.
//
// It does not stay up. Render's free tier spins the service down after
// about fifteen minutes of quiet, and every deploy restarts it. Each
// time, the in-memory cache is empty again, so the next visitor waits
// while the backend re-downloads 10,000 rows from data.gov.in.
//
// Measured: /api/mandi/list took 4.1 SECONDS on a warm server with a
// cold cache, on top of a 21-second wake-up. The visitor pays for both.
//
// MongoDB is already connected and does survive restarts, so the answer
// is to write the built result there too. A cold start then reads one
// document instead of making a 10,000-row HTTP request.
//
// ---------------------------------------------------------------------
// WHAT THIS IS NOT
// ---------------------------------------------------------------------
// Not a replacement for the in-memory cache - that is still faster and
// still checked first. This is the second line: memory, then Mongo,
// then the upstream API.
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

const cachedPayloadSchema = new mongoose.Schema(
  {
    // What this is a cache OF - "mandi-directory", "ceda-crops".
    // Unique, because there is exactly one current value per key.
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // The built result, stored as-is. Mixed because each key holds a
    // different shape and Mongoose should not try to validate them.
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // When it was built. Freshness is judged against this rather than
    // against Mongoose's updatedAt, so the rule is explicit.
    fetchedAt: {
      type: Date,
      required: true,
    },

    // How long this particular result should be trusted, in
    // milliseconds. It is stored per-row because a real result is good
    // for hours while a fallback is good for minutes - see
    // mandiDirectoryService.js.
    lifetime: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Throw a row away a day after it was written, whatever its lifetime.
// Without this the collection keeps documents nobody will ever read
// again - and a stale row that outlives its usefulness is worse than no
// row, because it looks like an answer.
cachedPayloadSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model("CachedPayload", cachedPayloadSchema);
