// controllers/nearbyController.js
// -----------------------------------------------------------------------
// ONE feature lives here: "which mandi NEAR ME is paying the most for my
// crop?"
//
// It's the question that decides where a farmer actually drives on the
// morning of a sale. Check Rates already shows the best-paying mandi in
// the whole country - but a mandi 900 km away paying ₹300 more is
// useless. This adds the missing half: distance.
//
// WHERE THE FARMER'S LOCATION COMES FROM
// Either of two ways, and the endpoint accepts both:
//   1. lat + lon  - straight from the phone's GPS, when the farmer taps
//                   "Use my location". Nothing to look up.
//   2. place      - a typed town or district name, which we geocode.
//
// This file is deliberately separate from mandiController.js so that
// adding this feature couldn't disturb the existing rate-checking
// endpoints. It only READS from the shared services.
// -----------------------------------------------------------------------

const { fetchMandiPrices } = require("../services/mandiApiService");
const { getCommunityPriceStats } = require("../services/communityPriceService");
const {
  distanceInKm,
  findMandiLocation,
  geocodePlace,
} = require("../services/locationService");
const { logActivity } = require("../services/activityService");

// How far we look by default. 150 km is roughly a morning's drive with a
// loaded trailer - far enough to be worth comparing, close enough that
// the trip is realistic.
const DEFAULT_RADIUS_KM = 150;
const MAX_RADIUS_KM = 1000;

// ---------------------------------------------------------------------
// GET /api/mandi/nearby
//
//   ?crop=Onion&lat=19.99&lon=73.78          (from the phone's GPS)
//   ?crop=Onion&place=Nashik                 (typed by the farmer)
//
// Optional:
//   &radius=200        how far to look, in km (default 150, max 1000)
//   &sortBy=distance   default is "price" (highest first)
//   &date=2026-09-16   check a specific day instead of today
// ---------------------------------------------------------------------
async function getNearbyMandis(req, res) {
  try {
    const { crop, lat, lon, place, radius, sortBy, date } = req.query;

    if (!crop) {
      return res.status(400).json({
        message: "Please provide a crop name, e.g. ?crop=Onion",
      });
    }

    // ---- STEP 1: work out where the farmer is ----
    const origin = await resolveOrigin({ lat, lon, place });

    if (!origin) {
      return res.status(400).json({
        message:
          "Please share your location, or type a town/district name we can find.",
      });
    }

    // Keep the radius sensible whatever arrives in the URL.
    const radiusKm = Math.min(
      MAX_RADIUS_KM,
      Math.max(1, Number(radius) || DEFAULT_RADIUS_KM)
    );

    // ---- STEP 2: get the prices for this crop ----
    // Both sources at once, as everywhere else in the app.
    const [government, community] = await Promise.all([
      // Ask for a much fuller set than the other pages do. A popular
      // crop has 500+ records nationwide, and with the usual 100 the
      // farmer's own local mandi may simply never be looked at - which
      // would defeat the entire point of a "near me" search.
      fetchMandiPrices(crop, date, { limit: 2000 }),
      getCommunityPriceStats(crop),
    ]);

    // ---- STEP 3: put every mandi on the map and measure the distance ----
    const withDistance = [];
    let couldNotLocate = 0;

    for (const price of government.prices) {
      if (!price.modalPrice) continue; // no usable price, skip it

      const location = findMandiLocation(price.state, price.district);
      if (!location) {
        couldNotLocate++;
        continue;
      }

      const km = distanceInKm(origin, location);

      // What did OUR farmers report at this same mandi? Nice to show
      // alongside the official rate, when we happen to have it.
      const communityMatch = community.records.find(
        (r) => r.mandiName.toLowerCase() === price.market.toLowerCase()
      );

      withDistance.push({
        mandiName: price.market,
        district: price.district,
        state: price.state,
        modalPrice: price.modalPrice,
        minPrice: price.minPrice,
        maxPrice: price.maxPrice,
        arrivalDate: price.arrivalDate,
        distanceKm: Math.round(km * 10) / 10,
        // "district" = we know the district's position, so this is good
        // to within a few tens of km. "state" = we only know the state,
        // so the distance is rough. The frontend says which.
        distanceAccuracy: location.accuracy,
        farmerReportedPrice: communityMatch ? communityMatch.averagePrice : null,
        farmerReportCount: communityMatch ? communityMatch.reportCount : 0,
      });
    }

    // ---- STEP 4: keep only what's within reach ----
    const withinRadius = withDistance.filter((m) => m.distanceKm <= radiusKm);

    // ---- STEP 5: order them ----
    // Highest price first by default - that's the question being asked.
    // On a tie, the closer mandi wins, because between two mandis paying
    // the same the nearer one is plainly better.
    const sorted = [...withinRadius].sort((a, b) => {
      if (sortBy === "distance") {
        return a.distanceKm - b.distanceKm || b.modalPrice - a.modalPrice;
      }
      return b.modalPrice - a.modalPrice || a.distanceKm - b.distanceKm;
    });

    // ---- STEP 6: a couple of headline answers ----
    const bestPaying = sorted.length > 0 ? maxBy(sorted, (m) => m.modalPrice) : null;
    const nearest = sorted.length > 0 ? minBy(sorted, (m) => m.distanceKm) : null;

    // How much more the best-paying mandi gives than the nearest one, and
    // how much further it is. This is the actual trade-off a farmer is
    // weighing up, so we work it out for them rather than making them do
    // the arithmetic on a phone screen.
    let tradeOff = null;
    if (bestPaying && nearest && bestPaying.mandiName !== nearest.mandiName) {
      tradeOff = {
        extraRupeesPerQuintal: bestPaying.modalPrice - nearest.modalPrice,
        extraKm: Math.round((bestPaying.distanceKm - nearest.distanceKm) * 10) / 10,
      };
    }

    await logActivity(
      req.user,
      "CHECK_RATES",
      `Searched nearby mandis for ${crop} around ${origin.label}`,
      { crop, place: origin.label, radiusKm, found: sorted.length }
    );

    res.status(200).json({
      crop,
      origin: {
        lat: origin.lat,
        lon: origin.lon,
        label: origin.label,
        source: origin.source, // "gps" | "district-list" | "openstreetmap"
      },
      radiusKm,
      sortBy: sortBy === "distance" ? "distance" : "price",
      mandis: sorted,
      totalFound: sorted.length,
      // Honesty counters, shown on screen so an empty list is explainable
      // rather than just mysterious.
      totalPricedMandis: withDistance.length,
      outsideRadius: withDistance.length - withinRadius.length,
      couldNotLocate,
      bestPaying,
      nearest,
      tradeOff,
      dataSource: government.dataSource,
      matchedDate: government.matchedDate,
    });
  } catch (error) {
    console.error("Error finding nearby mandis:", error);
    res.status(500).json({ message: "Failed to find nearby mandis." });
  }
}

/**
 * Turns whatever the request gave us into one point on the map.
 * GPS coordinates are preferred - they need no lookup and can't be
 * misunderstood the way a place name can.
 */
async function resolveOrigin({ lat, lon, place }) {
  // --- Option 1: real coordinates from the phone ---
  const latNumber = Number(lat);
  const lonNumber = Number(lon);

  const hasValidCoordinates =
    lat !== undefined &&
    lon !== undefined &&
    Number.isFinite(latNumber) &&
    Number.isFinite(lonNumber) &&
    latNumber >= -90 &&
    latNumber <= 90 &&
    lonNumber >= -180 &&
    lonNumber <= 180;

  if (hasValidCoordinates) {
    return {
      lat: latNumber,
      lon: lonNumber,
      label: "your current location",
      source: "gps",
    };
  }

  // --- Option 2: a typed place name ---
  if (place && place.trim()) {
    const found = await geocodePlace(place);
    if (found) {
      return { lat: found.lat, lon: found.lon, label: found.label, source: found.source };
    }
  }

  return null;
}

// Two tiny helpers. Array.reduce() would do the job, but a named function
// reads far better at the call site than a reduce with a ternary in it.
function maxBy(items, getValue) {
  return items.reduce((best, item) => (getValue(item) > getValue(best) ? item : best));
}

function minBy(items, getValue) {
  return items.reduce((best, item) => (getValue(item) < getValue(best) ? item : best));
}

module.exports = { getNearbyMandis };
