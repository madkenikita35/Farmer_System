// controllers/mandiController.js
// -----------------------------------------------------------------------
// A small controller dedicated to LIVE mandi price lookups that don't
// need a receipt at all. This powers the app's SECOND main feature:
// "check rates before you sell" - a farmer types in a crop (and
// optionally their state) and sees prices from BOTH data sources
// BEFORE deciding where/when to sell, without uploading anything.
//
// It also powers the MANDI DIRECTORY: how many mandis are registered,
// searching through them, and clicking into one to see every crop it
// sells with both government and farmer-reported prices.
//
// WHO CAN USE THESE?
// All of these routes require the farmer to be logged in - the guard is
// in routes/mandiRoutes.js. That's the "after login only, a user can
// enter the website" requirement.
// -----------------------------------------------------------------------

const { fetchMandiPrices } = require("../services/mandiApiService");
const {
  distanceInKm,
  findMandiLocation,
  findStateForCoordinates,
} = require("../services/locationService");
// The same guard the Near Me page uses - see services/priceQuality.js
// for why junk prices have to go before anything looks for an extreme.
const { dropImpossiblePrices } = require("../services/priceQuality");
const { getCommunityPriceStats } = require("../services/communityPriceService");
const {
  getMandiDirectory,
  getCropsInMandi,
  getCropCoverage,
} = require("../services/mandiDirectoryService");
const { logActivity } = require("../services/activityService");

// GET /api/mandi/prices?crop=Wheat&date=2026-09-15
// "date" is optional (YYYY-MM-DD) - defaults to today inside
// fetchMandiPrices() if not provided. Kept as its own simple endpoint
// for anyone who only wants the government numbers.
async function getPricesByCrop(req, res) {
  try {
    const { crop, date } = req.query;

    if (!crop) {
      return res.status(400).json({ message: "Please provide a crop name, e.g. ?crop=Wheat" });
    }

    const { prices, dataSource, matchedDate } = await fetchMandiPrices(crop, date);
    res.status(200).json({ crop, prices, dataSource, matchedDate });
  } catch (error) {
    console.error("Error fetching mandi prices:", error);
    res.status(500).json({ message: "Failed to fetch mandi prices." });
  }
}

// ---------------------------------------------------------------------
// Helper: work out WHICH MANDI is paying the most and which the least.
//
// This is the "after comparing prices it must show which mandi is
// offering higher and lower prices" feature. It's deliberately its own
// function so comparePrices() below stays short and readable.
//
// It combines BOTH data sources into one list of {mandi, price, source}
// entries, then just picks the biggest and smallest. Where the same
// mandi appears in both sources, we keep them as two separate entries
// (labelled by source) so the farmer can see the official rate and the
// real reported rate for that mandi side by side.
// ---------------------------------------------------------------------
function findBestAndWorstMandis(governmentPrices, communityRecords) {
  const allOffers = [];

  // Every government-reported mandi becomes one entry.
  for (const p of governmentPrices) {
    if (!p.modalPrice) continue; // skip rows with no usable price
    allOffers.push({
      mandiName: p.market,
      state: p.state,
      price: p.modalPrice,
      source: "government",
      date: p.arrivalDate || "",
      reportCount: null,
    });
  }

  // Every mandi our own farmers reported becomes one entry too.
  for (const c of communityRecords) {
    if (!c.averagePrice) continue;
    allOffers.push({
      mandiName: c.mandiName,
      state: c.state,
      price: c.averagePrice,
      source: "community",
      date: c.lastReportedDate || "",
      reportCount: c.reportCount,
    });
  }

  if (allOffers.length === 0) {
    return {
      bestMandi: null,
      worstMandi: null,
      priceGap: null,
      rankedMandis: [],
    };
  }

  // Sort highest price first. [...allOffers] makes a COPY before
  // sorting, because .sort() changes the array in place and we don't
  // want to surprise the caller by reordering their data.
  const ranked = [...allOffers].sort((a, b) => b.price - a.price);

  const bestMandi = ranked[0]; // highest price = best place to sell
  const worstMandi = ranked[ranked.length - 1]; // lowest price

  return {
    bestMandi,
    worstMandi,
    // How much more you'd get per quintal by selling at the best mandi
    // instead of the worst. This is the number that actually makes a
    // farmer money, so it's worth showing prominently.
    priceGap: bestMandi.price - worstMandi.price,
    priceGapPercent: worstMandi.price
      ? Math.round(((bestMandi.price - worstMandi.price) / worstMandi.price) * 100)
      : null,
    // The full ranked list, so the frontend can show a "best to worst"
    // table underneath the two headline cards.
    rankedMandis: ranked,
  };
}

// GET /api/mandi/compare?crop=Wheat&state=Maharashtra&date=2026-09-15
// "state" and "date" are both optional. This is the endpoint the
// "Check Rates Before Selling" page uses - it returns BOTH data
// sources at once so the frontend can show them side by side:
//   - government: official data.gov.in Agmarknet prices
//   - community:  what OTHER FARMERS using this app actually got paid
// ...plus which mandi is paying the most and the least right now.
// =====================================================================
// THE THREE SCOPES ON THE CHECK RATES PAGE
// =====================================================================
// "Where is this crop dearest and cheapest?" has three different
// answers depending on how far the farmer is willing to travel:
//
//   near you   - only mandis within the chosen radius
//   state      - every mandi in their state
//   national   - every mandi in the country
//
// All three are computed HERE rather than in the browser, because the
// price rows the API returns carry no coordinates - only a market,
// district and state. Turning those into a distance needs the
// 345-district coordinate table and the fuzzy district matching in
// locationService.js, and shipping both to every browser would
// duplicate logic that already exists and works.
// =====================================================================

/**
 * Attaches a distance to every priced mandi we can place on a map.
 *
 * Mandis whose district we hold no coordinates for get `distanceKm:
 * null` rather than being dropped - they still belong in the state and
 * national comparisons, we simply cannot say how far away they are.
 */
function withDistances(prices, origin) {
  return prices
    .filter((p) => p.modalPrice > 0)
    .map((p) => {
      const location = origin ? findMandiLocation(p.state, p.district) : null;

      return {
        mandiName: p.market,
        state: p.state,
        district: p.district || "",
        price: p.modalPrice,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        date: p.arrivalDate,
        distanceKm: location ? Math.round(distanceInKm(origin, location) * 10) / 10 : null,
        distanceAccuracy: location ? location.accuracy || "district" : null,
      };
    });
}

/**
 * Highest, lowest and the gap between them, for one set of mandis.
 *
 * Returns a consistent shape even when empty, so the page can render a
 * card with an empty state instead of branching on undefined.
 */
function buildScope(mandis, extra = {}) {
  if (mandis.length === 0) {
    return {
      highest: null,
      lowest: null,
      priceGap: 0,
      priceGapPercent: 0,
      mandiCount: 0,
      ...extra,
    };
  }

  const highest = mandis.reduce((a, b) => (b.price > a.price ? b : a));
  const lowest = mandis.reduce((a, b) => (b.price < a.price ? b : a));

  // Rounded because the feed carries fractional prices - Agra came back
  // at 2765.04, and 2765.04 - 2350 is 415.03999999999996 in binary
  // floating point. Printing that on a card would look like a bug in
  // our arithmetic rather than a quirk of the format.
  const gap = Math.round(highest.price - lowest.price);

  return {
    highest,
    lowest,
    priceGap: gap,
    // Percent OF THE LOWEST - "40% more than the cheapest", which is
    // the comparison a farmer is actually making. Against the highest
    // it would read smaller and mean less.
    priceGapPercent: lowest.price > 0 ? Math.round((gap / lowest.price) * 100) : 0,
    mandiCount: mandis.length,
    ...extra,
  };
}

async function comparePrices(req, res) {
  try {
    const { crop, state, date, lat, lon, radius } = req.query;

    if (!crop) {
      return res.status(400).json({ message: "Please provide a crop name, e.g. ?crop=Wheat" });
    }

    // Where is the farmer? Optional - without it the "near you" and
    // state cards cannot be built, and the page shows them greyed with
    // a button to share location.
    const latNumber = Number(lat);
    const lonNumber = Number(lon);
    const origin =
      Number.isFinite(latNumber) && Number.isFinite(lonNumber)
        ? { lat: latNumber, lon: lonNumber }
        : null;

    // The radius is an OPTIONAL FILTER, not a precondition - see the
    // long note in nearbyController.js. Absent means "no cap": show the
    // nearest mandi wherever it is, rather than an empty card.
    //
    // When a value IS given it is clamped, so a hand-edited URL cannot
    // ask for a 40,000km "radius" and quietly turn the local card into
    // the national one.
    const hasRadius = radius !== undefined && radius !== null && String(radius).trim() !== "";
    const parsedRadius = hasRadius ? Number(radius) : NaN;
    const radiusKm = Number.isFinite(parsedRadius)
      ? Math.min(Math.max(parsedRadius, 1), 500)
      : null;

    // Run both lookups at the same time (they don't depend on each
    // other) - Promise.all() is faster than awaiting them one by one.
    const [government, community] = await Promise.all([
      // The limit used to default to 100, which quietly made the
      // "national" comparison a comparison of the first 100 mandis the
      // API happened to return. For wheat that reported a national high
      // of Rs 3,350 when the real figure across all 118 mandis was
      // Rs 7,000 - wrong, and wrong in a way nothing on screen hinted
      // at. A national card has to actually see the nation.
      fetchMandiPrices(crop, date, { limit: 5000 }),
      getCommunityPriceStats(crop, state),
    ]);

    const governmentAveragePrice =
      government.prices.length > 0
        ? Math.round(
            government.prices.reduce((sum, p) => sum + p.modalPrice, 0) /
              government.prices.length
          )
        : null;

    // Which mandi pays best / worst for this crop right now?
    const comparison = findBestAndWorstMandis(government.prices, community.records);

    // ---- The three scopes ----
    // Junk prices are removed once, up front, so all three scopes agree
    // about what counts as a real price.
    // NOTE the price accessor. withDistances() renames modalPrice to
    // `price`, and the shared guard defaults to reading `modalPrice` -
    // the field the Near Me page uses. Without this argument it finds
    // no numbers at all, filters nothing, and the junk rows come
    // straight back: the lowest onion in India reads Rs 0 again.
    const { kept: allMandis, dropped: impossiblePrices } = dropImpossiblePrices(
      withDistances(government.prices, origin),
      (row) => row.price
    );

    if (impossiblePrices > 0) {
      console.warn(
        `⚠️  ${impossiblePrices} price row(s) for "${crop}" were below a tenth of the ` +
          `median and treated as data errors. See dropImpossiblePrices().`
      );
    }

    // Which state are we comparing? An explicitly typed filter wins
    // over a guess from coordinates - the farmer knows where they are
    // better than a nearest-centroid lookup does.
    const derivedState = origin ? findStateForCoordinates(origin) : null;
    const scopeStateName = (state && state.trim()) || derivedState?.state || null;

    // Everything we could place on the map, nearest first.
    const locatable = origin
      ? allMandis
          .filter((m) => m.distanceKm != null)
          .sort((a, b) => a.distanceKm - b.distanceKm)
      : [];

    const insideRadius =
      radiusKm == null ? locatable : locatable.filter((m) => m.distanceKm <= radiusKm);

    // A radius that matches nothing falls back to the nearest overall,
    // and says so, rather than showing an empty card.
    const nearYouRadiusEmpty =
      radiusKm != null && insideRadius.length === 0 && locatable.length > 0;

    const nearYouMandis = nearYouRadiusEmpty ? locatable : insideRadius;

    const stateMandis = scopeStateName
      ? allMandis.filter(
          (m) => (m.state || "").trim().toLowerCase() === scopeStateName.trim().toLowerCase()
        )
      : [];

    const scopes = {
      nearYou: buildScope(nearYouMandis, {
        radiusKm,
        radiusFilterEmpty: nearYouRadiusEmpty,
        hasLocation: Boolean(origin),
        // How many mandis we could NOT place on the map. Without this a
        // farmer cannot tell "nothing is near you" from "we could not
        // locate anything".
        unlocatable: origin ? allMandis.filter((m) => m.distanceKm == null).length : null,
      }),
      state: buildScope(stateMandis, {
        stateName: scopeStateName,
        derivedFrom: state && state.trim() ? "filter" : derivedState ? "location" : null,
        // How far the nearest district centroid was. A large number
        // means the state guess is shaky - near a border, say.
        derivedConfidenceKm: derivedState ? derivedState.confidenceKm : null,
      }),
      national: buildScope(allMandis, { impossiblePricesDropped: impossiblePrices }),
    };

    // Note this down for the admin's activity feed.
    await logActivity(
      req.user,
      "CHECK_RATES",
      `Checked rates for ${crop}${state ? ` in ${state}` : ""}`,
      { crop, state: state || null, date: date || null }
    );

    res.status(200).json({
      crop,
      state: state || null,
      government: {
        prices: government.prices,
        averagePrice: governmentAveragePrice,
        dataSource: government.dataSource,
        matchedDate: government.matchedDate,
      },
      community: {
        records: community.records,
        averagePrice: community.overallAveragePrice,
        reportCount: community.overallReportCount,
      },
      // ---- Where should this farmer actually sell? ----
      bestMandi: comparison.bestMandi,
      worstMandi: comparison.worstMandi,
      priceGap: comparison.priceGap,
      priceGapPercent: comparison.priceGapPercent,
      rankedMandis: comparison.rankedMandis,

      // ---- The three-card comparison ----
      // Added alongside the old fields rather than replacing them, so
      // anything still reading bestMandi/worstMandi keeps working.
      scopes,
    });
  } catch (error) {
    console.error("Error comparing mandi prices:", error);
    res.status(500).json({ message: "Failed to compare mandi prices." });
  }
}

// ---------------------------------------------------------------------
// GET /api/mandi/list?search=pune&state=Maharashtra
//
// The mandi DIRECTORY: how many mandis are registered in the government
// dataset, and a searchable list of them. Both `search` and `state` are
// optional - with neither, you get every mandi.
// ---------------------------------------------------------------------
async function listMandis(req, res) {
  try {
    const { search = "", state = "" } = req.query;

    const directory = await getMandiDirectory({ search, state });

    // Only log actual searches, not the plain "show me everything" load
    // that happens when the page first opens - otherwise the admin's
    // activity feed fills up with noise.
    if (search) {
      await logActivity(req.user, "SEARCH_MANDI", `Searched mandis for "${search}"`, {
        search,
        state: state || null,
        resultCount: directory.matchCount,
      });
    }

    res.status(200).json(directory);
  } catch (error) {
    console.error("Error listing mandis:", error);
    res.status(500).json({ message: "Failed to load the mandi list." });
  }
}

// ---------------------------------------------------------------------
// GET /api/mandi/crops?mandi=Pune&state=Maharashtra
//
// Everything sold in ONE mandi: each crop, its government price, what
// our farmers reported, and the gap between the two. This is the page
// you land on after clicking a mandi in the search results.
// ---------------------------------------------------------------------
async function getMandiCrops(req, res) {
  try {
    const { mandi, state } = req.query;

    if (!mandi) {
      return res.status(400).json({
        message: "Please provide a mandi name, e.g. ?mandi=Pune",
      });
    }

    const result = await getCropsInMandi(mandi, state);

    await logActivity(req.user, "VIEW_MANDI", `Viewed crops in ${mandi} mandi`, {
      mandi,
      state: state || null,
      cropCount: result.totalCrops,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching mandi crops:", error);
    res.status(500).json({ message: "Failed to load crops for that mandi." });
  }
}

// ---------------------------------------------------------------------
// GET /api/mandi/crop-coverage
//
// "Which crop is listed in the most mandis today, and which in the
// fewest?" - the data behind the two charts on the Mandis page.
//
// ABOUT THE WORD "ARRIVED": this counts the mandis that LISTED a price
// for each crop today. It is not arrival volume. The government price
// resource publishes prices only - there is no quantity field in it at
// all - so no honest tonnage figure can be derived from this data. The
// response says so in `measures`, and the page repeats it on screen,
// rather than letting a chart imply we know something we do not.
// ---------------------------------------------------------------------
async function getCropCoverageChart(req, res) {
  try {
    const coverage = await getCropCoverage();

    // How many bars each chart gets. More than about a dozen and the
    // crop names on the x-axis overlap into mush on a phone.
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 3), 25);

    // `crops` arrives sorted most-listed first (see the service), so
    // the two ends of the same array are the two charts.
    const mostListed = coverage.crops.slice(0, limit);

    // The least-listed end, flipped so the chart reads smallest-first.
    const leastListed = coverage.crops.slice(-limit).reverse();

    res.status(200).json({
      mostListed,
      leastListed,
      totalCrops: coverage.totalCrops,
      totalMandis: coverage.totalMandis,
      dataSource: coverage.dataSource,
      fallbackReason: coverage.fallbackReason,
      // Stated explicitly so nobody reads these bars as tonnage.
      measure: "mandis_listing_the_crop",
      arrivalQuantityAvailable: false,
    });
  } catch (error) {
    console.error("Error building crop coverage:", error);
    res.status(500).json({ message: "Failed to load the crop coverage charts." });
  }
}

// ---------------------------------------------------------------------
// GET /api/mandi/crops
//
// Every crop the GOVERNMENT feed is carrying today, for the crop
// dropdowns.
//
// WHY NOT THE CEDA LIST: CEDA knows 453 commodities, but the Near Me
// and Check Rates pages search data.gov.in, which carries about 206 and
// spells some of them differently. Offering a crop the search cannot
// match would produce a dropdown where some choices silently return
// nothing - worse than a text box, because the user would have no
// reason to doubt their own input.
//
// It costs no extra API call: the directory download is already cached
// for six hours and this reads the same copy.
// ---------------------------------------------------------------------
async function listCropNames(req, res) {
  try {
    const coverage = await getCropCoverage();

    // Alphabetical. The coverage list arrives sorted by popularity,
    // which is the right order for a chart and the wrong one for a
    // dropdown you are trying to find a name in.
    const crops = [...coverage.crops]
      .map((c) => ({
        name: c.crop,
        category: c.category,
        mandiCount: c.mandiCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      crops,
      totalCrops: crops.length,
      dataSource: coverage.dataSource,
    });
  } catch (error) {
    console.error("Error listing crop names:", error);
    res.status(500).json({ message: "Failed to load the crop list." });
  }
}

module.exports = {
  getPricesByCrop,
  comparePrices,
  listMandis,
  getMandiCrops,
  getCropCoverageChart,
  listCropNames,
};
