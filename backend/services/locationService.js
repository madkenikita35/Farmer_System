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

module.exports = { distanceInKm, findMandiLocation, geocodePlace };
