// services/persistentCache.js
// -----------------------------------------------------------------------
// read/write helpers for the cache that survives a restart.
//
// Two functions, both deliberately forgiving: a cache that throws is
// worse than no cache at all, so every failure here logs and falls
// through to "we don't have it", letting the caller do the real work.
// -----------------------------------------------------------------------

const CachedPayload = require("../models/CachedPayload");

// The keys in use. Constants so a typo is a crash at startup rather
// than a cache that silently never hits.
const KEYS = {
  MANDI_DIRECTORY: "mandi-directory",
  CEDA_CROPS: "ceda-crops",
  CEDA_GEOGRAPHIES: "ceda-geographies",
};

/**
 * The stored value for `key`, or null if there isn't a fresh one.
 *
 * "Fresh" is judged against the lifetime that was saved WITH the row,
 * not a constant here - a real result and a fallback result get
 * different lifetimes, and the row remembers which it is.
 */
async function readCache(key) {
  try {
    const row = await CachedPayload.findOne({ key }).lean();
    if (!row) return null;

    const age = Date.now() - new Date(row.fetchedAt).getTime();
    if (age > row.lifetime) return null; // stale

    return { payload: row.payload, fetchedAt: row.fetchedAt, ageMs: age };
  } catch (error) {
    // A database hiccup must not take the price pages down. The caller
    // will fetch upstream instead, which is slower but correct.
    console.warn(`Cache read failed for ${key}:`, error.message);
    return null;
  }
}

/**
 * Stores `payload` under `key`.
 *
 * NOT awaited by callers: the visitor who triggered the rebuild should
 * not also wait for us to write it down. Errors are swallowed for the
 * same reason - the data they asked for is already on its way.
 */
function writeCache(key, payload, lifetime) {
  CachedPayload.findOneAndUpdate(
    { key },
    { key, payload, lifetime, fetchedAt: new Date() },
    { upsert: true }
  ).catch((error) => {
    console.warn(`Cache write failed for ${key}:`, error.message);
  });
}

module.exports = { KEYS, readCache, writeCache };
