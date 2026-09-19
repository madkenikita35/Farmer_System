// models/SyncStatus.js
// -----------------------------------------------------------------------
// When did each external data source last give us data successfully?
//
// ---------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------
// Prices come from other people's APIs - data.gov.in's Agmarknet feed
// and CEDA's - and they do not arrive all at once. Mandis report through
// the day, so a farmer who checks at 9am and again at 4pm sees different
// numbers for the same crop on the same day.
//
// That looks like a bug. It is not: it is a feed filling up. But the app
// gave no way to tell the difference, so the screen now says when the
// data it is showing actually arrived.
//
// ---------------------------------------------------------------------
// WHY IT IS IN MONGO AND NOT JUST A VARIABLE
// ---------------------------------------------------------------------
// The services already remember `fetchedAt` in memory for caching. That
// is not good enough for this: the server restarts on every deploy, and
// on a free host it also sleeps after a quiet spell. An in-memory
// timestamp would read "never synced" every morning, which is both wrong
// and alarming.
//
// One document per source, overwritten in place. This collection never
// grows past a handful of rows.
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

const syncStatusSchema = new mongoose.Schema(
  {
    // "agmarknet" (data.gov.in mandi prices) or "ceda" (price history).
    // One document each, which is what `unique` enforces.
    source: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // The moment the last SUCCESSFUL fetch completed. A failed call
    // never touches this - otherwise a week of outages would still show
    // a fresh timestamp, which is the exact lie this is meant to
    // prevent.
    lastSyncedAt: {
      type: Date,
      required: true,
    },

    // How many rows that fetch brought back. Useful when the timestamp
    // looks fine but the screen is empty: 0 records says the feed
    // answered and had nothing, which is a different problem from the
    // feed being down.
    recordCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SyncStatus", syncStatusSchema);
