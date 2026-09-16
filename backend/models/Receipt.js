// models/Receipt.js
// -----------------------------------------------------------------------
// A "model" describes the SHAPE of the data we store in MongoDB.
// Think of it like a table structure in SQL, but for MongoDB (a NoSQL DB).
//
// Every time a farmer uploads a mandi receipt/slip, we save one
// "Receipt" document with:
//   - what the OCR read off the slip (raw + extracted fields)
//   - what we found when we compared it against live mandi prices
// -----------------------------------------------------------------------

const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    // WHO uploaded this receipt.
    // "ref: User" means we store that user's _id here, which lets the
    // admin dashboard answer "show me everything THIS farmer uploaded",
    // and lets a farmer see only their own receipts on their dashboard.
    //
    // It's optional (not `required`) on purpose: any receipts you saved
    // while testing BEFORE login existed won't have one, and we don't
    // want those old rows to break. They simply won't belong to anyone.
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // A copy of the uploader's name, so the admin's receipt table can
    // show it without a database lookup per row (same "denormalising"
    // idea as in models/ActivityLog.js).
    uploadedByName: {
      type: String,
      default: "",
    },

    // The original file name of the uploaded receipt image
    imageName: {
      type: String,
      required: true,
    },

    // The full raw text that Tesseract OCR extracted from the image.
    // We keep this so you can always see exactly what OCR "read".
    rawOcrText: {
      type: String,
      default: "",
    },

    // ---- Fields extracted from OCR (or edited/confirmed by the user) ----
    crop: {
      type: String,
      required: true,
    },
    mandiName: {
      type: String,
      default: "Unknown Mandi",
    },
    state: {
      type: String,
      default: "",
    },
    quantityInQuintal: {
      type: Number,
      required: true,
    },
    pricePerQuintal: {
      type: Number, // what the farmer says they were actually paid
      required: true,
    },

    // The date the farmer actually sold the crop (as printed on the
    // receipt, or picked/edited by the user). Stored as "YYYY-MM-DD" so
    // it matches an HTML <input type="date">. This is the date we ask
    // the government Mandi API for prices on - see mandiApiService.js.
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },

    // ---- Fields calculated by comparing with the live Mandi API ----
    marketAveragePrice: Number, // average GOVERNMENT "modal" price across mandis for this crop
    marketMinPrice: Number,
    marketMaxPrice: Number,

    // ---- Fields calculated by comparing with OTHER FARMERS' receipts ----
    // (the "community" / crowdsourced data source - see communityPriceService.js)
    communityAveragePrice: Number, // avg price OTHER farmers reported for this crop recently
    communityReportCount: {
      type: Number,
      default: 0,
    },

    // The single number the verdict is actually based on: a blend of
    // the government average and the community average when both are
    // available, so one "official" number and many "real farmer"
    // numbers both get a say. Falls back to whichever one exists if
    // only one data source had data.
    blendedAveragePrice: Number,

    priceDifference: Number, // pricePerQuintal - blendedAveragePrice
    priceDifferencePercent: Number,
    verdict: {
      type: String, // "Fair Price" | "Underpaid" | "Overpaid" | "No Data"
      default: "No Data",
    },

    // Transparency fields: WHERE did the comparison numbers come from?
    // "real-exact-date"   -> government API had data for the exact sale date
    // "real-nearest-date" -> government API had data, but for the closest
    //                        available date instead of the exact one
    // "mock"              -> no API key / API had nothing, so sample data
    //                        was used purely so the app still works
    dataSource: {
      type: String,
      default: "mock",
    },
    // The actual arrival_date (from the government dataset, DD/MM/YYYY)
    // that the comparison numbers were based on. Empty for mock data.
    matchedMarketDate: {
      type: String,
      default: "",
    },

    // A snapshot of the mandi-wise comparison data we used,
    // so the dashboard can redraw the exact chart later without
    // calling the external API again.
    comparisonData: [
      {
        market: String,
        state: String,
        arrivalDate: String,
        modalPrice: Number,
        minPrice: Number,
        maxPrice: Number,
      },
    ],
  },
  {
    // This automatically adds "createdAt" and "updatedAt" fields,
    // so we always know when each receipt was uploaded.
    timestamps: true,
  }
);

module.exports = mongoose.model("Receipt", receiptSchema);
