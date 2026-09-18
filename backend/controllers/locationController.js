// controllers/locationController.js
// -----------------------------------------------------------------------
// Turns whatever the farmer typed into ONE lat/lon pair.
//
//   GET /api/location/resolve?method=pincode&pincode=411001
//   GET /api/location/resolve?method=address&district=Pune&taluka=Haveli&...
//   GET /api/location/resolve?method=coords&lat=18.52&lon=73.85
//   GET /api/location/resolve?method=place&place=Nashik
//
// ---------------------------------------------------------------------
// WHY ONE ENDPOINT FOR ALL FOUR
// ---------------------------------------------------------------------
// The Near Me page offers several ways to say where you are, but every
// downstream feature - the radius search, the distance on each card,
// the state comparison - wants the same thing: a latitude and a
// longitude.
//
// Resolving once here means the rest of the app never learns there are
// four input methods. Adding a fifth later touches this file and the
// form, and nothing else.
// -----------------------------------------------------------------------

const {
  resolvePincode,
  geocodeAddress,
  geocodePlace,
  findStateForCoordinates,
  PINCODE_PATTERN,
} = require("../services/locationService");

// India is roughly 6-38 N and 68-98 E. A generous box around it, used
// to catch the classic mistake of entering a longitude in the latitude
// box - the app is for Indian mandis, so a point in the Atlantic is a
// typo rather than a user in Brazil.
const INDIA_BOUNDS = { minLat: 5, maxLat: 38, minLon: 67, maxLon: 98 };

function isInIndia(lat, lon) {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lon >= INDIA_BOUNDS.minLon &&
    lon <= INDIA_BOUNDS.maxLon
  );
}

async function resolveLocation(req, res) {
  try {
    const { method = "place", pincode, lat, lon, place } = req.query;

    let resolved = null;

    // ---- 1. Pincode ----
    if (method === "pincode") {
      if (!PINCODE_PATTERN.test(String(pincode || "").trim())) {
        return res.status(400).json({
          message: "A pincode is 6 digits and does not start with 0, e.g. 411001.",
        });
      }

      resolved = await resolvePincode(pincode);
      if (!resolved) {
        return res.status(404).json({
          message: `We could not find pincode ${pincode}. Please check it, or use another method.`,
        });
      }
    }

    // ---- 2. Structured address ----
    else if (method === "address") {
      const { address, postOffice, taluka, district, state } = req.query;

      if (![address, postOffice, taluka, district].some((v) => String(v || "").trim())) {
        return res.status(400).json({
          message: "Please fill in at least one of address, post office, taluka or district.",
        });
      }

      resolved = await geocodeAddress({ address, postOffice, taluka, district, state });
      if (!resolved) {
        return res.status(404).json({
          message: "We could not find that address. Try just the taluka and district.",
        });
      }
    }

    // ---- 3. Typed latitude / longitude ----
    else if (method === "coords") {
      const latNumber = Number(lat);
      const lonNumber = Number(lon);

      if (!Number.isFinite(latNumber) || !Number.isFinite(lonNumber)) {
        return res.status(400).json({ message: "Latitude and longitude must be numbers." });
      }

      if (Math.abs(latNumber) > 90 || Math.abs(lonNumber) > 180) {
        return res.status(400).json({
          message: "Latitude must be between -90 and 90, longitude between -180 and 180.",
        });
      }

      // Caught rather than silently searched: with lat and lon swapped,
      // Pune (18.5, 73.9) becomes a point in the Arabian Sea, and every
      // distance on the page would be wrong in a way nothing explains.
      if (!isInIndia(latNumber, lonNumber)) {
        const swappedWouldWork = isInIndia(lonNumber, latNumber);

        return res.status(400).json({
          message: swappedWouldWork
            ? "That point is outside India - are the latitude and longitude the wrong way round?"
            : "That point is outside India. This app covers Indian mandis only.",
          swappedWouldWork,
        });
      }

      resolved = { lat: latNumber, lon: lonNumber, label: `${latNumber}, ${lonNumber}`, source: "manual" };
    }

    // ---- 4. A typed town or district (what the page did before) ----
    else {
      if (!String(place || "").trim()) {
        return res.status(400).json({ message: "Please type a town or district." });
      }

      resolved = await geocodePlace(place);
      if (!resolved) {
        return res.status(404).json({ message: `We could not find "${place}".` });
      }
    }

    // Every method gains a state, so the state-level cards work no
    // matter how the farmer told us where they are.
    const derived = findStateForCoordinates({ lat: resolved.lat, lon: resolved.lon });

    res.status(200).json({
      lat: resolved.lat,
      lon: resolved.lon,
      label: resolved.label || null,
      method,
      source: resolved.source || null,
      accuracy: resolved.accuracy || null,
      state: resolved.state || derived?.state || null,
      district: resolved.district || derived?.district || null,
      // How far the nearest district centre was - a large number means
      // the state guess is shaky, e.g. near a border.
      stateConfidenceKm: derived ? derived.confidenceKm : null,
      broadened: resolved.broadened || false,
      postOfficeCount: resolved.postOfficeCount || null,
    });
  } catch (error) {
    console.error("Error resolving location:", error);
    res.status(500).json({ message: "Could not work out that location." });
  }
}

module.exports = { resolveLocation };
