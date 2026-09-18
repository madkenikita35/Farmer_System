// services/locationService.js
// -----------------------------------------------------------------------
// Everything to do with WHERE things are, for the "nearest mandi paying
// the most" feature.
//
// It answers two questions:
//   1. Where is this mandi?      -> findMandiLocation()
//   2. Where is the place the    -> geocodePlace()
//      farmer typed?
//
// ...and then measures the distance between them -> distanceInKm().
//
// =======================================================================
// WHY THIS IS HARDER THAN IT SOUNDS
// =======================================================================
// The government price dataset has no coordinates at all - only names
// ("Guntur", "Andhra Pradesh"). So before we can say which mandi is
// nearest, we have to turn those names into points on the map.
//
// We do that ONCE, offline, with buildDistrictCoordinates.js, and save
// the answers in config/districtCoordinates.json. This file just reads
// that. No API key, no network call, and nothing for the farmer to wait
// for.
//
// The farmer's OWN location is different - we can't know it in advance:
//   - "Use my location" gives us coordinates straight from the phone's
//     GPS, so there is nothing to look up at all; or
//   - they type a place name, which we look up live on OpenStreetMap and
//     then cache, so the second person to type "Nashik" gets it instantly.
// =======================================================================

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { STATE_CENTRES } = require("../config/stateCentres");

// ---------------------------------------------------------------------
// Load the pre-built district coordinates once, at startup.
// ---------------------------------------------------------------------
// Reading the file here (rather than on every request) means the disk is
// touched exactly once for the lifetime of the server.
let districtCoordinates = {};

try {
  const filePath = path.join(__dirname, "..", "config", "districtCoordinates.json");
  districtCoordinates = JSON.parse(fs.readFileSync(filePath, "utf8"));
  console.log(
    `📍 Loaded coordinates for ${Object.keys(districtCoordinates).length} districts.`
  );
} catch (error) {
  // Not fatal: without this file we simply fall back to state centres,
  // so distances get rougher but the feature still works.
  console.warn(
    "⚠️  districtCoordinates.json could not be read - distances will use " +
      "state centres only. Run: node buildDistrictCoordinates.js"
  );
}

// =======================================================================
// 1. MEASURING DISTANCE
// =======================================================================

/**
 * How far apart are two points on the Earth, in kilometres?
 *
 * This is the "haversine formula". You can't just subtract the latitudes
 * and longitudes, because the Earth is a ball, not a flat sheet - one
 * degree of longitude is about 111 km at the equator but shrinks to
 * nothing at the poles. The formula below accounts for that curve.
 *
 * You do not need to follow the trigonometry to work on this app. What
 * matters is: give it two lat/lon pairs, get back the straight-line
 * distance over the Earth's surface.
 *
 * NOTE this is distance "as the crow flies", NOT road distance. A mandi
 * 40 km away across a river might be a 90 km drive. The app says
 * "straight-line distance" on screen so nobody plans a trip believing
 * otherwise.
 */
function distanceInKm(pointA, pointB) {
  const EARTH_RADIUS_KM = 6371;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const latDifference = toRadians(pointB.lat - pointA.lat);
  const lonDifference = toRadians(pointB.lon - pointA.lon);

  const a =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(toRadians(pointA.lat)) *
      Math.cos(toRadians(pointB.lat)) *
      Math.sin(lonDifference / 2) *
      Math.sin(lonDifference / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// =======================================================================
// 2. FINDING A MANDI ON THE MAP
// =======================================================================

/**
 * Where is this mandi? Tries the most precise source first.
 *
 * @returns {{lat, lon, accuracy} | null}
 *   accuracy is "district" (good, within a few tens of km) or
 *   "state" (rough - the mandi's district wasn't in our lookup, so this
 *   is the middle of the whole state). The caller passes that on to the
 *   frontend so a rough distance can be labelled as rough.
 */
function findMandiLocation(state, district) {
  const cleanState = (state || "").trim();
  const cleanDistrict = (district || "").trim();

  // --- Best: an exact district match from the pre-built file ---
  const exact = districtCoordinates[`${cleanState}|||${cleanDistrict}`];
  if (exact) return exact;

  // --- Next: the same district name under a different state spelling ---
  // The dataset isn't perfectly consistent ("Chattisgarh" vs
  // "Chhattisgarh"), so a district-only match is still worth having.
  if (cleanDistrict) {
    const lowerDistrict = cleanDistrict.toLowerCase();
    for (const [key, value] of Object.entries(districtCoordinates)) {
      const [, keyDistrict] = key.split("|||");
      if (keyDistrict && keyDistrict.toLowerCase() === lowerDistrict) {
        return value;
      }
    }
  }

  // --- Last resort: the middle of the state ---
  const centre = STATE_CENTRES[cleanState];
  if (centre) return { lat: centre.lat, lon: centre.lon, accuracy: "state" };

  // We genuinely have no idea where this is.
  return null;
}

// =======================================================================
// 3. FINDING THE FARMER'S TYPED PLACE
// =======================================================================

// Places people type get cached in memory, so the same town isn't looked
// up twice. Like the mandi-list cache, this empties when the server
// restarts - fine for a learning project.
const placeCache = new Map();

// Nominatim asks callers to identify themselves and to stay under one
// request per second. We honour both.
const NOMINATIM_USER_AGENT = "MandiPriceChecker/1.0 (student learning project)";
let lastNominatimCallAt = 0;

/**
 * Turns a typed place name ("Nashik", "Pune, Maharashtra") into
 * coordinates.
 *
 * Order of attempts:
 *   1. the in-memory cache
 *   2. our own district file - free and instant, and covers most of the
 *      places a farmer using this app would type
 *   3. OpenStreetMap, for anything else
 *
 * @returns {Promise<{lat, lon, label, source} | null>}
 */
async function geocodePlace(placeName) {
  const query = (placeName || "").trim();
  if (!query) return null;

  const cacheKey = query.toLowerCase();
  if (placeCache.has(cacheKey)) {
    return placeCache.get(cacheKey);
  }

  // --- 2. Try our own district list first ---
  // It costs nothing and answers instantly, so it's worth checking before
  // troubling an external service.
  const lowerQuery = cacheKey;
  for (const [key, value] of Object.entries(districtCoordinates)) {
    const [keyState, keyDistrict] = key.split("|||");
    if (
      keyDistrict.toLowerCase() === lowerQuery ||
      `${keyDistrict}, ${keyState}`.toLowerCase() === lowerQuery
    ) {
      const found = {
        lat: value.lat,
        lon: value.lon,
        label: `${keyDistrict}, ${keyState}`,
        source: "district-list",
      };
      placeCache.set(cacheKey, found);
      return found;
    }
  }

  // --- 3. Ask OpenStreetMap ---
  try {
    // Space out our calls to stay inside Nominatim's fair-use policy.
    const millisecondsSinceLastCall = Date.now() - lastNominatimCallAt;
    if (millisecondsSinceLastCall < 1100) {
      await new Promise((resolve) => setTimeout(resolve, 1100 - millisecondsSinceLastCall));
    }
    lastNominatimCallAt = Date.now();

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        format: "json",
        limit: 1,
        q: query,
        countrycodes: "in", // this app is for Indian mandis only
      },
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
      timeout: 15000,
    });

    const results = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      // Cache the miss too - otherwise a typo gets re-sent to the API on
      // every single search.
      placeCache.set(cacheKey, null);
      return null;
    }

    const found = {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon),
      label: results[0].display_name,
      source: "openstreetmap",
    };

    placeCache.set(cacheKey, found);
    return found;
  } catch (error) {
    console.warn(`⚠️  Could not look up the place "${query}":`, error.message);
    return null;
  }
}

// =====================================================================
// PINCODE -> A PLACE ON THE MAP
// =====================================================================
// India Post publishes a free pincode directory at
// api.postalpincode.in. No key, no signup, no rate limit published.
//
// It gives the post office, block/taluka, district and state - but NO
// COORDINATES. That is fine, because we already hold coordinates for
// 345 districts: the pincode tells us the district, and our own table
// turns the district into a point. One light API call, and the
// coordinate step never leaves the process.
//
// This is why the pincode path does not use Nominatim, which is
// throttled to one request a second and already shared with the typed
// town box and the address fields.
//
// TWO TRAPS IN THIS API, both confirmed against the live service:
//
//   1. An unknown pincode returns HTTP *200* with
//      { Status: "Error", Message: "No records found" }.
//      Checking the status code alone would treat it as a success and
//      then fall over reading PostOffice[0].
//
//   2. One pincode covers MANY post offices - 411001 returns 8, and
//      282001 returns 19. They share a district, so any of them will
//      do for our purpose; we take the first and keep the count so the
//      caller can say "Pune (8 post offices)" rather than implying we
//      pinpointed a building.
// =====================================================================

const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

/**
 * Turns a 6-digit Indian pincode into a point on the map.
 *
 * @param {string} pincode
 * @returns {Promise<{lat, lon, label, district, state, source}|null>}
 */
async function resolvePincode(pincode) {
  const clean = String(pincode || "").trim();

  // A pincode never starts with 0, which is why the pattern is
  // [1-9] and not \d for the first digit.
  if (!PINCODE_PATTERN.test(clean)) return null;

  const cacheKey = `pin:${clean}`;
  if (placeCache.has(cacheKey)) return placeCache.get(cacheKey);

  try {
    const response = await axios.get(`https://api.postalpincode.in/pincode/${clean}`, {
      timeout: 15000,
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });

    const body = Array.isArray(response.data) ? response.data[0] : response.data;

    // Trap 1: success is in the BODY, not the status code.
    if (!body || body.Status !== "Success" || !Array.isArray(body.PostOffice) || body.PostOffice.length === 0) {
      placeCache.set(cacheKey, null);
      return null;
    }

    const office = body.PostOffice[0];
    const district = (office.District || "").trim();
    const state = (office.State || "").trim();

    // Our own table turns the district into coordinates - no second
    // network call.
    const point = findMandiLocation(state, district);
    if (!point) {
      placeCache.set(cacheKey, null);
      return null;
    }

    const found = {
      lat: point.lat,
      lon: point.lon,
      label: `${clean} - ${district}, ${state}`,
      district,
      state,
      // Said plainly: a pincode gets you to the district, not the
      // doorstep, and the distances shown are only as precise as that.
      accuracy: point.accuracy || "district",
      postOfficeCount: body.PostOffice.length,
      source: "india-post",
    };

    placeCache.set(cacheKey, found);
    return found;
  } catch (error) {
    console.warn(`⚠️  Pincode lookup failed for ${clean}:`, error.message);
    return null;
  }
}

// =====================================================================
// A STRUCTURED ADDRESS -> A PLACE ON THE MAP
// =====================================================================
// Four fields (address, post office, taluka, district) joined into one
// query for the geocoder we already use.
//
// Ordered narrowest to widest, which is what Nominatim expects, and
// blank fields are dropped so a farmer who only knows their taluka and
// district still gets an answer instead of a query full of commas.
// =====================================================================

/**
 * @param {{address, postOffice, taluka, district, state}} parts
 * @returns {Promise<{lat, lon, label, source}|null>}
 */
async function geocodeAddress(parts = {}) {
  const pieces = [parts.address, parts.postOffice, parts.taluka, parts.district, parts.state]
    .map((piece) => String(piece || "").trim())
    .filter(Boolean);

  if (pieces.length === 0) return null;

  // geocodePlace already checks our district list first, throttles to
  // Nominatim's one-per-second policy, and caches both hits and misses.
  // Reusing it means the address path inherits all of that.
  const query = pieces.join(", ");
  const found = await geocodePlace(query);

  if (found) return { ...found, source: found.source || "openstreetmap", query };

  // Nothing matched the full address. Retry with just the wide parts -
  // a mistyped village should not lose the district we were also told.
  const wide = [parts.taluka, parts.district, parts.state]
    .map((piece) => String(piece || "").trim())
    .filter(Boolean)
    .join(", ");

  if (wide && wide !== query) {
    const fallback = await geocodePlace(wide);
    if (fallback) return { ...fallback, query: wide, broadened: true };
  }

  return null;
}

// =====================================================================
// WHICH STATE IS THIS LAT/LON IN?
// =====================================================================
// The Check Rates page needs the farmer's state to build its
// state-level comparison, and all it has is coordinates from the
// browser.
//
// The obvious answer is reverse geocoding - ask Nominatim what is at
// this point. We deliberately do NOT, for two reasons:
//
//   1. Nominatim's usage policy is one request per second. A page that
//      searches on every "Check Rates" click would either queue behind
//      that or risk being blocked.
//   2. We already hold coordinates for 345 districts. The nearest one
//      to any point in India is, in practice, in the right state.
//
// So this is a nearest-neighbour lookup over data already in memory:
// no network, no rate limit, no new dependency, and an answer in under
// a millisecond.
//
// THE LIMIT OF THIS APPROACH: near a state border the nearest district
// centroid can belong to the neighbouring state - a farmer just inside
// Karnataka could be assigned to Maharashtra. `confidenceKm` is
// returned so the caller can see how far away the match was, and the
// page lets the farmer override it by typing a state.
// =====================================================================

/**
 * The state whose nearest district centroid is closest to a point.
 *
 * @param {{lat:number, lon:number}} origin
 * @returns {{state, district, confidenceKm}|null}
 */
function findStateForCoordinates(origin) {
  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) {
    return null;
  }

  let best = null;

  for (const [key, value] of Object.entries(districtCoordinates)) {
    const [state, district] = key.split("|||");
    const km = distanceInKm(origin, value);

    if (!best || km < best.confidenceKm) {
      best = { state, district, confidenceKm: Math.round(km * 10) / 10 };
    }
  }

  return best;
}

// =====================================================================
// SANITY CHECK: is this "nearest" answer plausible?
// =====================================================================
// A farmer in Pune was told the nearest mandi was 144 km away, in
// Ratnagiri. The maths was right and the coordinates were right - the
// government feed simply had no Pune mandi that morning. Of ~7,000
// mandis in India it carried 267 that hour, exactly one of them in
// Maharashtra.
//
// That is a data problem rather than a code problem, but it LOOKS
// identical to a real bug from the outside: swapped lat/lon, a wrong
// formula, or a hardcoded fallback location would all produce the same
// symptom - a nearest mandi that is implausibly far away.
//
// So we log it. If this warning appears for a big city, check in this
// order:
//   1. How many mandis reported at all? (the usual answer)
//   2. Does the origin lat/lon look right, or are they swapped?
//      A swap puts Pune (18.5, 73.9) in the Arabian Sea off Somalia.
//   3. Does findMandiLocation resolve the nearby districts?
//
// Deliberately console.warn and not something shown to the user: a
// farmer does not need our diagnostics, and the reply text already
// explains the situation in their own language.
// =====================================================================

// Past this, a "nearest" mandi is suspicious. No Indian city is 100 km
// from every mandi on a normal day.
const IMPLAUSIBLE_NEAREST_KM = 100;

/**
 * Logs a warning when the nearest mandi found is improbably distant.
 *
 * @param {object} details
 * @param {number} details.km            - distance to the nearest found
 * @param {string} [details.mandiName]
 * @param {object} [details.origin]      - { lat, lon } we searched from
 * @param {string} [details.originLabel]
 * @param {number} [details.candidateCount] - how many mandis we considered
 * @param {string} [details.source]      - which feature asked
 * @returns {boolean} true when the warning fired
 */
function warnIfNearestImplausible({
  km,
  mandiName = "",
  origin = null,
  originLabel = "",
  candidateCount = null,
  source = "nearest-mandi",
}) {
  if (!Number.isFinite(km) || km <= IMPLAUSIBLE_NEAREST_KM) return false;

  const where = originLabel || (origin ? `${origin.lat}, ${origin.lon}` : "unknown origin");

  console.warn(
    `⚠️  [${source}] Nearest mandi is ${Math.round(km)} km away ` +
      `(${mandiName || "unnamed"}) from ${where}. ` +
      `That is further than expected` +
      (candidateCount != null ? ` - only ${candidateCount} mandi(s) had usable locations.` : ".") +
      ` Check: how many mandis reported today, then whether lat/lon are the right way round.`
  );

  return true;
}

module.exports = {
  distanceInKm,
  findMandiLocation,
  findStateForCoordinates,
  geocodePlace,
  resolvePincode,
  geocodeAddress,
  PINCODE_PATTERN,
  warnIfNearestImplausible,
  IMPLAUSIBLE_NEAREST_KM,
};
