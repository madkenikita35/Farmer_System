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
  findStateForCoordinates,
  warnIfNearestImplausible,
  geocodePlace,
} = require("../services/locationService");
const { logActivity } = require("../services/activityService");
const { dropImpossiblePrices } = require("../services/priceQuality");

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
// =====================================================================
// THE TWO HEADLINE CARDS, AND WHY THEY ARE NOT "BEST" AND "NEAREST"
// =====================================================================
// Card 1 is easy: the best price in the radius. Highest if the farmer
// is selling, lowest if they are buying.
//
// Card 2 used to be "the nearest mandi at any price", which is a poor
// second card - the closest mandi can be the one paying the least in
// the whole radius, so the page cheerfully recommended driving to the
// worst option because it was near.
//
// It is now "the CLOSEST among the good-priced ones". That is the card
// a farmer actually wants: not the best price, not the shortest drive,
// but the shortest drive that still gets a good price.
//
// GOOD MEANS THE TOP QUARTER by price (bottom quarter when buying).
// A quartile holds up however prices are spread, unlike "above
// average", which collapses to a single mandi whenever one of them pays
// far more than the rest - leaving Card 2 a copy of Card 1.
//
// The floor of 2 candidates is there for thin days: with three mandis
// in radius, a strict 25% would select one, and the two cards would
// again be identical.
// =====================================================================

const GOOD_PRICE_FRACTION = 0.25;
const MIN_GOOD_CANDIDATES = 2;

function pickHeadlineMandis(mandis, mode) {
  if (!mandis || mandis.length === 0) {
    return { bestPrice: null, closestGood: null, goodCandidateCount: 0 };
  }

  const selling = mode !== "buy";

  // Best price first, for whichever direction "best" means here.
  const byPrice = [...mandis].sort((a, b) =>
    selling ? b.modalPrice - a.modalPrice : a.modalPrice - b.modalPrice
  );

  const bestPrice = byPrice[0];

  const takeCount = Math.max(
    MIN_GOOD_CANDIDATES,
    Math.ceil(byPrice.length * GOOD_PRICE_FRACTION)
  );
  const goodOnes = byPrice.slice(0, Math.min(takeCount, byPrice.length));

  // Of those, the one requiring the shortest drive.
  const closestGood = goodOnes.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a));

  return {
    bestPrice,
    closestGood,
    goodCandidateCount: goodOnes.length,
    // The price that got you into the "good" group, so the page can
    // explain the cut rather than asserting it.
    goodPriceThreshold: Math.round(goodOnes[goodOnes.length - 1].modalPrice),
  };
}

async function getNearbyMandis(req, res) {
  try {
    const { crop, lat, lon, place, radius, sortBy, date } = req.query;

    // "sell" (the default) or "buy". Anything else is treated as sell
    // rather than rejected - a bad value in a URL should not stop a
    // farmer seeing prices.
    const mode = req.query.mode === "buy" ? "buy" : "sell";

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

    // ---- Remove impossible prices before ranking anything ----
    //
    // This matters far more in BUY mode, which looks for the SMALLEST
    // number and so lands on a data-entry error every time one exists.
    // Before this, buying onion near Pune recommended a mandi at Rs 18
    // a quintal. See services/priceQuality.js.
    const cleaned = dropImpossiblePrices(sorted);
    if (cleaned.dropped > 0) {
      console.warn(
        `⚠️  Near Me: ignored ${cleaned.dropped} price row(s) for "${crop}" below ` +
          `Rs ${cleaned.floor} (a tenth of the median) as data errors.`
      );
    }
    const ranked = cleaned.kept;

    // ---- STEP 6: the two headline answers ----
    //
    // Which two depends on why the farmer is here. Selling, they want
    // the most money; buying, the least. See pickHeadlineMandis().
    const headline = pickHeadlineMandis(ranked, mode);

    const bestPrice = headline.bestPrice;
    const closestGood = headline.closestGood;

    // Kept so anything still reading the old field name keeps working.
    const bestPaying = headline.bestPrice;
    const nearest = ranked.length > 0 ? minBy(ranked, (m) => m.distanceKm) : null;

    // Sanity check, logged not shown. A nearest mandi over 100 km away
    // is the same symptom a swapped lat/lon or a broken distance
    // formula would produce, so it is worth a line in the log even
    // when - as in the Pune case - the real cause is simply that few
    // mandis reported that day. See locationService.js.
    if (nearest) {
      warnIfNearestImplausible({
        km: nearest.distanceKm,
        mandiName: nearest.mandiName,
        origin,
        originLabel: origin && origin.label,
        candidateCount: withinRadius.length,
        source: "near-me-page",
      });
    }

    // How much more the best-paying mandi gives than the nearest one, and
    // how much further it is. This is the actual trade-off a farmer is
    // weighing up, so we work it out for them rather than making them do
    // the arithmetic on a phone screen.
    let tradeOff = null;
    if (bestPrice && closestGood && bestPrice.mandiName !== closestGood.mandiName) {
      // Always a POSITIVE number, whichever way round the comparison
      // runs. Selling, the best mandi pays more; buying, it costs less.
      // Both are "worth this much per quintal", and the page says
      // whether that is money gained or saved.
      const difference =
        mode === "buy"
          ? closestGood.modalPrice - bestPrice.modalPrice
          : bestPrice.modalPrice - closestGood.modalPrice;

      tradeOff = {
        extraRupeesPerQuintal: Math.round(difference),
        extraKm: Math.round((bestPrice.distanceKm - closestGood.distanceKm) * 10) / 10,
        mode,
      };
    }

    // =================================================================
    // THE THREE SCOPES
    // =================================================================
    // The same question - where is the best price - asked at three
    // distances: inside the radius, across the state, across India.
    //
    // All three use pickHeadlineMandis(), so the meaning of "best" and
    // of "closest good one" is identical everywhere and flips with
    // buy/sell in one place rather than three.
    //
    // The national list is every priced mandi we could locate. The
    // state list is that, filtered to the farmer's state - taken from
    // their coordinates, since this page has no state box of its own.
    const nationalRanked = dropImpossiblePrices(withDistance).kept;

    const derivedState = findStateForCoordinates(origin);
    const scopeStateName = derivedState ? derivedState.state : null;

    const stateRanked = scopeStateName
      ? nationalRanked.filter(
          (m) => (m.state || "").trim().toLowerCase() === scopeStateName.toLowerCase()
        )
      : [];

    const buildScope = (list, extra = {}) => {
      const picked = pickHeadlineMandis(list, mode);
      return {
        bestPrice: picked.bestPrice,
        closestGood: picked.closestGood,
        goodCandidateCount: picked.goodCandidateCount,
        goodPriceThreshold: picked.goodPriceThreshold,
        mandiCount: list.length,
        ...extra,
      };
    };

    const scopes = {
      nearYou: buildScope(ranked, { radiusKm }),
      state: buildScope(stateRanked, {
        stateName: scopeStateName,
        // How far the nearest district centre was. A big number means
        // the state guess is shaky - near a border, for instance.
        stateConfidenceKm: derivedState ? derivedState.confidenceKm : null,
      }),
      national: buildScope(nationalRanked),
    };

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

      // ---- The two headline cards, per buy/sell ----
      mode,
      bestPrice,
      closestGood,
      goodCandidateCount: headline.goodCandidateCount,
      goodPriceThreshold: headline.goodPriceThreshold,

      // ---- Near you / state / national, all respecting buy-sell ----
      scopes,
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
