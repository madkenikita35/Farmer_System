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
const { getCommunityPriceStats } = require("../services/communityPriceService");
const { getMandiDirectory, getCropsInMandi } = require("../services/mandiDirectoryService");
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
async function comparePrices(req, res) {
  try {
    const { crop, state, date } = req.query;

    if (!crop) {
      return res.status(400).json({ message: "Please provide a crop name, e.g. ?crop=Wheat" });
    }

    // Run both lookups at the same time (they don't depend on each
    // other) - Promise.all() is faster than awaiting them one by one.
    const [government, community] = await Promise.all([
      fetchMandiPrices(crop, date),
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

module.exports = { getPricesByCrop, comparePrices, listMandis, getMandiCrops };
