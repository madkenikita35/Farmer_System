// controllers/receiptController.js
// -----------------------------------------------------------------------
// A "controller" contains the actual step-by-step LOGIC for handling a
// request. Routes just say "when this URL is hit, call this function" -
// the real work happens here.
//
// This controller handles everything related to a farmer's receipt:
//   1. scanReceipt   -> run OCR on an uploaded image, return guessed fields
//   2. createReceipt -> save the (confirmed) receipt + compare with market
//   3. getReceipts   -> list all saved receipts (for the dashboard table)
//   4. getDashboardStats -> numbers + chart-ready data for the dashboard
// -----------------------------------------------------------------------

const Receipt = require("../models/Receipt");
const { extractReceiptDetails } = require("../services/ocrService");
const { fetchMandiPrices } = require("../services/mandiApiService");
const { getCommunityPriceStats } = require("../services/communityPriceService");
const { logActivity } = require("../services/activityService");

// ---------------------------------------------------------------------
// A small helper used by getReceipts() and getDashboardStats() below.
//
// THE RULE: a farmer sees only their OWN receipts. An admin sees
// EVERYONE'S. So the database filter we use depends on who's asking.
//
// Returning {} means "no filter" = every receipt. Returning
// { uploadedBy: <id> } means "only this person's".
//
// Every route that uses this runs behind `protect` (see
// routes/receiptRoutes.js), so req.user is always filled in here.
// ---------------------------------------------------------------------
function buildOwnershipFilter(user) {
  if (user.role === "admin") {
    return {}; // admins see the whole platform
  }
  return { uploadedBy: user._id }; // farmers see only their own
}

// ---------------------------------------------------------------------
// STEP 1: Run OCR on the uploaded image and send back guessed fields.
// The frontend shows these in an editable form BEFORE actually saving.
// ---------------------------------------------------------------------
async function scanReceipt(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file was uploaded." });
    }

    const extracted = await extractReceiptDetails(req.file.path);

    await logActivity(req.user, "SCAN_RECEIPT", `${req.user.name} scanned a receipt image`, {
      imageName: req.file.filename,
    });

    res.status(200).json({
      message: "Receipt scanned successfully",
      imageName: req.file.filename,
      ...extracted,
    });
  } catch (error) {
    console.error("Error scanning receipt:", error);
    res.status(500).json({ message: "Failed to scan the receipt image." });
  }
}

// ---------------------------------------------------------------------
// Small helper: given the price the farmer got, the live GOVERNMENT
// mandi prices, and what OTHER FARMERS recently reported for the same
// crop, work out whether it was a fair price - and prep chart data.
// Kept as its own function so createReceipt() below stays readable.
//
// WHY TWO DATA SOURCES?
// The government's official numbers can miss a local mandi or lag by a
// day. What nearby farmers actually got paid (crowdsourced from other
// receipts uploaded to this app) is real, recent, ground-level
// evidence. So we work out an average from EACH source separately,
// then BLEND them into one "overall" number the verdict is based on -
// simple average of the two when both exist, otherwise whichever one
// we actually have.
// ---------------------------------------------------------------------
function comparePriceWithMarket(pricePerQuintal, mandiPrices, communityStats) {
  const modalPrices = mandiPrices.map((m) => m.modalPrice).filter(Boolean);

  const marketAveragePrice =
    modalPrices.length > 0
      ? Math.round(modalPrices.reduce((sum, p) => sum + p, 0) / modalPrices.length)
      : null;
  const marketMinPrice = modalPrices.length > 0 ? Math.min(...modalPrices) : null;
  const marketMaxPrice = modalPrices.length > 0 ? Math.max(...modalPrices) : null;

  const communityAveragePrice = communityStats?.overallAveragePrice ?? null;
  const communityReportCount = communityStats?.overallReportCount ?? 0;

  // Blend the two averages. If only one source has data, just use that
  // one - no need to punish a brand-new app with zero community data
  // yet by treating "no data" as zero.
  let blendedAveragePrice = null;
  if (marketAveragePrice != null && communityAveragePrice != null) {
    blendedAveragePrice = Math.round((marketAveragePrice + communityAveragePrice) / 2);
  } else if (marketAveragePrice != null) {
    blendedAveragePrice = marketAveragePrice;
  } else if (communityAveragePrice != null) {
    blendedAveragePrice = communityAveragePrice;
  }

  if (blendedAveragePrice == null) {
    return {
      marketAveragePrice,
      marketMinPrice,
      marketMaxPrice,
      communityAveragePrice,
      communityReportCount,
      blendedAveragePrice: null,
      priceDifference: null,
      priceDifferencePercent: null,
      verdict: "No Data",
    };
  }

  const priceDifference = pricePerQuintal - blendedAveragePrice;
  const priceDifferencePercent = Math.round(
    (priceDifference / blendedAveragePrice) * 100
  );

  // Simple, easy-to-explain rule:
  // within 5% of the blended average -> "Fair Price"
  // more than 5% below               -> "Underpaid"
  // more than 5% above               -> "Overpaid" (rare, but good to show!)
  let verdict = "Fair Price";
  if (priceDifferencePercent <= -5) verdict = "Underpaid";
  else if (priceDifferencePercent >= 5) verdict = "Overpaid";

  return {
    marketAveragePrice,
    marketMinPrice,
    marketMaxPrice,
    communityAveragePrice,
    communityReportCount,
    blendedAveragePrice,
    priceDifference,
    priceDifferencePercent,
    verdict,
  };
}

// ---------------------------------------------------------------------
// STEP 2: Save the final (user-confirmed) receipt, after comparing the
// farmer's price against live/mock mandi prices for that crop.
// ---------------------------------------------------------------------
async function createReceipt(req, res) {
  try {
    const {
      imageName,
      rawOcrText,
      crop,
      mandiName,
      state,
      date,
      quantityInQuintal,
      pricePerQuintal,
    } = req.body;

    if (!crop || !pricePerQuintal || !quantityInQuintal) {
      return res.status(400).json({
        message: "crop, pricePerQuintal and quantityInQuintal are required.",
      });
    }

    // The date the crop was actually sold - defaults to today if the
    // farmer didn't have/enter one. This is the date we ask the real
    // Mandi API to match prices against (see mandiApiService.js).
    const saleDate = date || new Date().toISOString().slice(0, 10);

    // 1. Get live (or mock) mandi prices for this crop, matched to the
    // sale date as closely as the government dataset allows.
    const { prices: mandiPrices, dataSource, matchedDate } = await fetchMandiPrices(
      crop,
      saleDate
    );

    // 2. Get what OTHER FARMERS have recently reported for this crop -
    // this is "our data", crowdsourced from everyone else's receipts.
    const communityStats = await getCommunityPriceStats(crop, state);

    // 3. Compare the farmer's price against BOTH data sources at once.
    const comparison = comparePriceWithMarket(
      Number(pricePerQuintal),
      mandiPrices,
      communityStats
    );

    // 4. Save everything together as one Receipt document. Saving this
    // also means it immediately becomes part of the community pool for
    // the NEXT farmer who checks this crop - no extra work needed.
    const receipt = await Receipt.create({
      // Stamp the receipt with WHO uploaded it. We take this from
      // req.user (set by the `protect` middleware from their login
      // token) and never from req.body - otherwise a farmer could
      // simply post someone else's id and upload receipts as them.
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,

      imageName: imageName || "unknown.jpg",
      rawOcrText: rawOcrText || "",
      crop,
      mandiName: mandiName || "Unknown Mandi",
      state: state || "",
      date: saleDate,
      quantityInQuintal: Number(quantityInQuintal),
      pricePerQuintal: Number(pricePerQuintal),
      ...comparison,
      dataSource,
      matchedMarketDate: matchedDate || "",
      comparisonData: mandiPrices,
    });

    await logActivity(
      req.user,
      "UPLOAD_RECEIPT",
      `${req.user.name} uploaded a ${crop} receipt from ${receipt.mandiName} (${comparison.verdict})`,
      {
        crop,
        mandiName: receipt.mandiName,
        pricePerQuintal: Number(pricePerQuintal),
        verdict: comparison.verdict,
      }
    );

    res.status(201).json({ message: "Receipt saved successfully", receipt });
  } catch (error) {
    console.error("Error creating receipt:", error);
    res.status(500).json({ message: "Failed to save the receipt." });
  }
}

// ---------------------------------------------------------------------
// STEP 3: Return receipts, most recent first - used for the
// "recent uploads" table on the dashboard.
//
// A farmer gets only their own; an admin gets everyone's. See
// buildOwnershipFilter() at the top of this file.
// ---------------------------------------------------------------------
async function getReceipts(req, res) {
  try {
    const filter = buildOwnershipFilter(req.user);
    const receipts = await Receipt.find(filter).sort({ createdAt: -1 });
    res.status(200).json(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Failed to fetch receipts." });
  }
}

// ---------------------------------------------------------------------
// STEP 4: Crunch numbers across the requester's receipts for the
// dashboard's summary cards and graphs.
//
// Again: a farmer's dashboard shows THEIR numbers, an admin's shows the
// whole platform's.
// ---------------------------------------------------------------------
async function getDashboardStats(req, res) {
  try {
    const filter = buildOwnershipFilter(req.user);
    const receipts = await Receipt.find(filter).sort({ createdAt: -1 });

    const totalReceipts = receipts.length;
    const underpaidCount = receipts.filter((r) => r.verdict === "Underpaid").length;
    const fairCount = receipts.filter((r) => r.verdict === "Fair Price").length;
    const overpaidCount = receipts.filter((r) => r.verdict === "Overpaid").length;

    // How many comparisons were built from REAL government data vs
    // sample/mock data - lets the dashboard be upfront about data quality.
    const realDataCount = receipts.filter(
      (r) => r.dataSource === "real-exact-date" || r.dataSource === "real-nearest-date"
    ).length;
    const mockDataCount = totalReceipts - realDataCount;

    // Total money a farmer could have gained if every "Underpaid" sale
    // had happened at the market average price instead.
    const totalPotentialLoss = receipts
      .filter((r) => r.verdict === "Underpaid")
      .reduce(
        (sum, r) =>
          sum + Math.abs(r.priceDifference || 0) * (r.quantityInQuintal || 0),
        0
      );

    // Data shaped for a bar chart: last 10 receipts, price paid vs each
    // data source's average, so you can see how government and
    // community numbers differ receipt by receipt.
    const priceComparisonChart = receipts
      .slice(0, 10)
      .reverse()
      .map((r) => ({
        name: `${r.crop} (${new Date(r.createdAt).toLocaleDateString()})`,
        pricePaid: r.pricePerQuintal,
        marketAverage: r.marketAveragePrice || 0,
        communityAverage: r.communityAveragePrice || 0,
      }));

    // Data shaped for a pie/summary chart: how many receipts fall into
    // each verdict category.
    const verdictBreakdown = [
      { name: "Fair Price", value: fairCount },
      { name: "Underpaid", value: underpaidCount },
      { name: "Overpaid", value: overpaidCount },
    ];

    res.status(200).json({
      totalReceipts,
      underpaidCount,
      fairCount,
      overpaidCount,
      totalPotentialLoss: Math.round(totalPotentialLoss),
      realDataCount,
      mockDataCount,
      priceComparisonChart,
      verdictBreakdown,
    });
  } catch (error) {
    console.error("Error building dashboard stats:", error);
    res.status(500).json({ message: "Failed to build dashboard stats." });
  }
}

module.exports = {
  scanReceipt,
  createReceipt,
  getReceipts,
  getDashboardStats,
};
