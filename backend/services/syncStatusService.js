// services/syncStatusService.js
// -----------------------------------------------------------------------
// Records and reads "when did this feed last give us data".
//
// Two functions: one the fetching code calls after a success, one the
// /api/sync-status route calls to read them back.
// -----------------------------------------------------------------------

const SyncStatus = require("../models/SyncStatus");

// The sources we track. Kept as constants so a typo in a caller is a
// crash at startup rather than a row nobody ever reads.
const SOURCES = {
  AGMARKNET: "agmarknet", // data.gov.in - today's mandi prices
  CEDA: "ceda", // Ashoka University - price history
};

// Don't write on every single request.
//
// A busy page can trigger several upstream fetches in a few seconds, and
// writing a document each time turns a display detail into database
// load for no gain - nobody can tell 14:32:01 from 14:32:09. So a write
// only happens if the stored time is already this old.
const MIN_WRITE_GAP_MS = 5 * 60 * 1000; // 5 minutes

// Remembering the last write in memory as well means the common case -
// "we wrote 20 seconds ago" - costs no database round trip at all.
const lastWriteAt = {};

/**
 * Call this ONLY after a fetch that actually succeeded.
 *
 * Never awaited by the caller: the farmer's price request should not
 * wait on our bookkeeping, and if this fails the prices are still
 * perfectly good. Hence the catch that only logs.
 */
function recordSuccessfulSync(source, recordCount = 0) {
  const now = Date.now();

  if (lastWriteAt[source] && now - lastWriteAt[source] < MIN_WRITE_GAP_MS) {
    return;
  }
  lastWriteAt[source] = now;

  SyncStatus.findOneAndUpdate(
    { source },
    { source, lastSyncedAt: new Date(now), recordCount },
    { upsert: true, new: true }
  ).catch((error) => {
    console.warn(`Could not record sync time for ${source}:`, error.message);
  });
}

/**
 * Every source we know about, newest first.
 *
 * Returns plain objects rather than mongoose documents, because this
 * goes straight out as JSON.
 */
async function getSyncStatus() {
  const rows = await SyncStatus.find().lean();

  const result = {};
  for (const row of rows) {
    result[row.source] = {
      lastSyncedAt: row.lastSyncedAt,
      recordCount: row.recordCount,
    };
  }

  // The most recent of all of them - what a page shows when it draws on
  // more than one feed, or does not care which.
  const times = rows
    .map((row) => row.lastSyncedAt)
    .filter(Boolean)
    .sort((a, b) => b - a);

  return {
    sources: result,
    lastSyncedAt: times[0] || null, // null = nothing has ever synced
  };
}

module.exports = { SOURCES, recordSuccessfulSync, getSyncStatus };
