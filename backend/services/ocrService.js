// services/ocrService.js
// -----------------------------------------------------------------------
// Reads a photographed mandi receipt / tax invoice and pulls out the six
// things the app needs:
//
//   crop · quantity · price per quintal · mandi name · state · date
//
// It uses Tesseract.js - a free, open-source OCR engine that runs on our
// own server (no API key, no cost) - and then a set of rules to make
// sense of the messy text it produces.
//
// =======================================================================
// WHY THIS FILE IS MORE THAN JUST A FEW REGEXES
// =======================================================================
// Here is what OCR actually returned for a real invoice we tested with:
//
//   1 JOMANIYA MTP (CORIANDUR) 09052150 150.00 13.400.00 KO0IG0 S40 107213400
//   Total 350 13,400 Told 1,072,134.00
//   State | Rapsthan    Soe Code 08
//
// Every single field is a problem:
//   - "CORIANDUR"  - the crop name is misspelt, so exact matching fails
//   - "Rapsthan"   - so is the state
//   - "13,400"     - a weight in KG, with no unit printed anywhere
//   - "KO0IG0"     - the rate column was destroyed completely
//   - "1,072,134"  - a total, not a per-quintal price
//
// So the four ideas that make this work are:
//
//   1. TRY SEVERAL IMAGE VERSIONS. A photo that reads badly at one
//      contrast setting often reads fine at another. We run OCR a few
//      different ways and keep whichever result found the most fields.
//
//   2. KEEP THE LINES. The old version flattened everything into one
//      long string, which destroyed the table layout - and on an
//      invoice the layout IS the meaning ("this number is in the
//      Weight column"). We now parse line by line.
//
//   3. MATCH FUZZILY. "CORIANDUR" is one letter from "CORIANDER", so we
//      accept it. See services/fuzzyMatch.js for how that works.
//
//   4. WORK THE PRICE OUT, DON'T JUST FIND IT. If the rate column is
//      unreadable but we can see the total (₹10,72,134) and the weight
//      (13,400 kg = 134 quintals), then the rate must be
//      10,72,134 / 134 = ₹8,001 per quintal. Which is exactly what the
//      invoice says. We also sanity-check every number we produce, so a
//      grand total never gets reported as a per-quintal price again.
//
// It still won't be perfect on every receipt - that's why the frontend
// always shows the results in an editable form before saving. But it now
// fills in most fields on most receipts, instead of most fields on none.
// -----------------------------------------------------------------------

const Tesseract = require("tesseract.js");
const fs = require("fs");
const { CROPS, STATES, UNITS, KEYWORDS } = require("../config/ocrDictionaries");
const { findBestMatch, containsKeyword } = require("./fuzzyMatch");

// ---------------------------------------------------------------------
// SANITY LIMITS
// ---------------------------------------------------------------------
// Real crop prices in India sit roughly between ₹200/quintal (fodder)
// and ₹1,00,000/quintal (saffron, premium spices). Anything outside that
// is certainly not a price - it's a phone number, an invoice number, or
// a grand total. Checking this is what stops the old bug where the
// scanner reported ₹11,42,400 as the price per quintal.
const MIN_SENSIBLE_PRICE = 100;
// Set high enough for genuinely premium produce - cardamom and saffron
// really do sell above a lakh per quintal - but far below the lakhs-to-
// crores figures that appear as invoice grand totals.
const MAX_SENSIBLE_PRICE = 300000;

// Similarly for quantity: under 0.01 quintal (1 kg) or over 50,000
// quintals (5,000 tonnes) on a single farmer's receipt is a misread.
const MIN_SENSIBLE_QUANTITY = 0.01;
const MAX_SENSIBLE_QUANTITY = 50000;

// =======================================================================
// PART 1 - GETTING THE BEST POSSIBLE TEXT OUT OF THE IMAGE
// =======================================================================

/**
 * Builds several differently-processed copies of the receipt image.
 *
 * Why several? Because there's no single setting that suits every photo.
 * A dark phone photo needs heavy contrast; a clean screenshot is best
 * left alone; faint thermal-printer ink reads best pure black-and-white.
 * Rather than guess, we make a few versions and let the results decide.
 *
 * Returns a list of { label, path } - always including the original, so
 * that even if `sharp` is missing or fails entirely, we can still scan.
 */
async function buildImageVariants(imagePath) {
  // Always keep the untouched original as a fallback option.
  const variants = [{ label: "original", path: imagePath }];

  try {
    const sharp = require("sharp");
    const metadata = await sharp(imagePath).metadata();

    // Small images OCR badly - blow them up to at least ~1800px wide.
    // Tesseract likes text roughly 20-30 pixels tall.
    const currentWidth = metadata.width || 1000;
    const targetWidth = currentWidth < 1800 ? 1800 : currentWidth;

    const makePath = (suffix) =>
      imagePath.replace(/(\.[a-zA-Z0-9]+)$/, `-${suffix}$1`);

    // --- Variant A: gentle clean-up (best for most phone photos) ---
    const enhancedPath = makePath("enhanced");
    await sharp(imagePath)
      .resize({ width: targetWidth })
      .greyscale()
      .normalise() // stretch the contrast so faint ink darkens
      .sharpen()
      .toFile(enhancedPath);
    variants.push({ label: "enhanced", path: enhancedPath });

    // --- Variant B: hard black-and-white (best for faint//thermal print) ---
    // "threshold" forces every pixel to pure black or pure white, which
    // removes shadows and paper texture that confuse the OCR engine.
    const binaryPath = makePath("binary");
    await sharp(imagePath)
      .resize({ width: targetWidth })
      .greyscale()
      .normalise()
      .threshold(140)
      .toFile(binaryPath);
    variants.push({ label: "binary", path: binaryPath });
  } catch (error) {
    // Missing or broken sharp install - we simply scan the original.
    console.warn("⚠️  Image pre-processing skipped:", error.message);
  }

  return variants;
}

/**
 * Runs Tesseract on one image, in one "page segmentation mode".
 *
 * PSM tells Tesseract what KIND of layout to expect, and it makes a
 * surprisingly large difference:
 *   6  = "one uniform block of text"  - good for simple handwritten slips
 *   4  = "a single column of text"    - good for printed invoices
 *   11 = "scattered text, any order"  - good for messy photos
 *
 * We try more than one and keep whichever reads best.
 */
async function runOcr(imagePath, pageSegmentationMode) {
  const { data } = await Tesseract.recognize(imagePath, "eng", {
    tessedit_pageseg_mode: String(pageSegmentationMode),
    // Preserve the spaces between words/columns. Without this, Tesseract
    // collapses the gaps in a table and we lose the column structure.
    preserve_interword_spaces: "1",
  });

  return { text: data.text || "", confidence: data.confidence || 0 };
}

/**
 * Scores how good one OCR attempt was, so we can compare attempts.
 *
 * We count the fields it managed to find, because that's what we
 * actually care about - a pass that reads beautiful gibberish is worse
 * than one that reads a bit roughly but finds the crop and the price.
 * Tesseract's own confidence score is used only to break ties.
 */
function scoreAttempt(fields, ocrConfidence) {
  const importantFields = [
    "crop",
    "pricePerQuintal",
    "quantityInQuintal",
    "mandiName",
    "state",
    "date",
  ];

  const found = importantFields.filter((key) => {
    const value = fields[key];
    return value !== null && value !== "" && value !== undefined;
  }).length;

  // Each found field is worth far more than any confidence difference,
  // so fields dominate the score and confidence only settles ties.
  return found * 1000 + ocrConfidence;
}

// =======================================================================
// PART 2 - THE MAIN ENTRY POINT
// =======================================================================

/**
 * Reads a receipt image and returns the extracted details.
 *
 * @param {string} imagePath - path to the uploaded image on disk
 * @returns {Promise<object>} the guessed fields, plus `rawOcrText` and
 *   some extra notes the review screen uses to flag uncertain values.
 */
/**
 * Checks an uploaded file really is a usable image BEFORE we hand it to
 * Tesseract.
 *
 * SECURITY: this is a denial-of-service fix, not a nicety. Tesseract
 * runs in a worker thread, and on a malformed or absurdly small image it
 * aborts with "RuntimeError: Aborted(-1)". That error surfaces on the
 * worker's 'error' event, OUTSIDE the try/catch around the OCR call, so
 * Node re-throws it on the next tick and the ENTIRE SERVER EXITS.
 *
 * A 67-byte 1x1 PNG was enough to do it. Any logged-in user could take
 * the whole app down, repeatedly, with one upload.
 *
 * So anything that isn't a real, reasonably-sized raster image is
 * rejected here, before it can reach the worker.
 */
async function validateImage(imagePath) {
  // Tesseract needs enough pixels to find a glyph; below this there is
  // nothing to read anyway, and this is the range that crashes it.
  const MIN_DIMENSION_PX = 32;
  const MAX_DIMENSION_PX = 20000; // guards against decompression bombs

  try {
    const sharp = require("sharp");
    const metadata = await sharp(imagePath).metadata();

    if (!metadata.width || !metadata.height) {
      return { ok: false, reason: "That file isn't a readable image." };
    }
    if (metadata.width < MIN_DIMENSION_PX || metadata.height < MIN_DIMENSION_PX) {
      return {
        ok: false,
        reason: `That image is only ${metadata.width}x${metadata.height} pixels - too small to read any text from. Please upload a clear photo of the receipt.`,
      };
    }
    if (metadata.width > MAX_DIMENSION_PX || metadata.height > MAX_DIMENSION_PX) {
      return { ok: false, reason: "That image is too large to process." };
    }
    return { ok: true };
  } catch (error) {
    // sharp throws on anything it can't decode - a renamed .txt, a
    // truncated upload, a file that isn't an image at all.
    return { ok: false, reason: "That file could not be read as an image." };
  }
}

async function extractReceiptDetails(imagePath) {
  // Reject anything that would crash the OCR worker - see validateImage().
  const check = await validateImage(imagePath);
  if (!check.ok) {
    return {
      rawOcrText: "",
      ...emptyFields(),
      scanQuality: "failed",
      fieldsFound: 0,
      scanNotes: [check.reason],
      notes: [check.reason],
    };
  }

  const variants = await buildImageVariants(imagePath);
  const temporaryFiles = variants
    .filter((v) => v.path !== imagePath)
    .map((v) => v.path);

  try {
    // The combinations we'll try, best-bet first. We stop early as soon
    // as one of them finds everything, so a clean receipt still scans
    // quickly - we only do the slow extra passes when we need them.
    const attemptPlan = [
      { variant: "enhanced", psm: 6 },
      { variant: "enhanced", psm: 4 },
      { variant: "binary", psm: 6 },
      { variant: "original", psm: 6 },
      { variant: "original", psm: 11 },
    ];

    // We run at least this many passes even when the first one looks
    // perfect, so there's always something to cross-check it against.
    // See combineResults() below for why that's worth the extra seconds.
    const MINIMUM_PASSES = 3;

    const results = [];

    for (const attempt of attemptPlan) {
      const variant = variants.find((v) => v.label === attempt.variant);
      if (!variant) continue; // that variant wasn't built (sharp failed)

      let result;
      try {
        result = await runOcr(variant.path, attempt.psm);
      } catch (error) {
        console.warn(`⚠️  OCR pass ${attempt.variant}/psm${attempt.psm} failed:`, error.message);
        continue;
      }

      const fields = extractFieldsFromText(result.text);
      const score = scoreAttempt(fields, result.confidence);
      results.push({ text: result.text, fields, score, attempt });

      // Once we've done enough passes to compare, stop early if the best
      // one already found everything - no point burning time on a
      // receipt we've clearly read properly.
      const bestSoFar = Math.max(...results.map((r) => r.score));
      if (results.length >= MINIMUM_PASSES && bestSoFar >= 6000) break;
    }

    // Every single pass failed (very unusual - a corrupt file, say).
    if (results.length === 0) {
      return {
        rawOcrText: "",
        ...emptyFields(),
        scanQuality: "failed",
        fieldsFound: 0,
        scanNotes: ["Could not read any text from this image."],
      };
    }

    return combineResults(results);
  } finally {
    // Always tidy up the processed copies, even if something threw -
    // otherwise the uploads folder fills with duplicate images.
    for (const file of temporaryFiles) {
      fs.unlink(file, () => {}); // fire-and-forget; ignore errors
    }
  }
}

/**
 * Merges several OCR passes into one final answer, field by field.
 *
 * ---------------------------------------------------------------------
 * WHY NOT JUST USE THE BEST PASS?
 * ---------------------------------------------------------------------
 * Because a pass can be the best overall and still be wrong about one
 * thing. On our test invoice, the winning pass read the date as
 * "26/11/2023" - Tesseract mistook the 5 for a 6. Two other passes read
 * "25/11/2023" correctly, but they'd found fewer fields overall, so
 * picking a single winner threw their correct date away.
 *
 * Different passes make different mistakes, but they tend to agree on
 * the truth. So instead of crowning one pass, we let them VOTE on each
 * field separately, with better passes carrying more weight. The date
 * two passes agree on beats the date only one pass saw.
 *
 * Quantity and price are voted on as a PAIR rather than separately,
 * because they have to be consistent with each other - mixing one
 * pass's quantity with another pass's price would give a combination
 * that was never actually on the receipt.
 */
function combineResults(results) {
  // A pass that found 5 fields gets more say than one that found 2.
  const weightOf = (result) => Math.max(1, Math.floor(result.score / 1000));

  /**
   * Runs the vote for one field. `readValue` pulls the value out of a
   * pass's fields, and we return whichever value collected the most
   * weight - ignoring passes that found nothing for that field.
   */
  function vote(readValue, isEmpty = (v) => v === "" || v === null || v === undefined) {
    const tally = new Map();

    for (const result of results) {
      const value = readValue(result.fields);
      if (isEmpty(value)) continue;

      const key = JSON.stringify(value);
      const existing = tally.get(key);
      if (existing) {
        existing.weight += weightOf(result);
      } else {
        tally.set(key, { value, weight: weightOf(result) });
      }
    }

    if (tally.size === 0) return null;

    const ranked = [...tally.values()].sort((a, b) => b.weight - a.weight);
    return ranked[0].value;
  }

  // The text we show in the "raw OCR text" box should come from the
  // single best pass - a merged blob of several passes would be
  // confusing to read when you're checking what went wrong.
  const bestPass = results.reduce((best, r) => (r.score > best.score ? r : best), results[0]);

  const crop = vote((f) => f.crop) || "";
  const mandiName = vote((f) => f.mandiName) || "";
  const state = vote((f) => f.state) || "";
  const date = vote((f) => f.date) || "";

  // Quantity + price voted on together, so they stay consistent.
  const money =
    vote(
      (f) => ({
        quantityInQuintal: f.quantityInQuintal,
        pricePerQuintal: f.pricePerQuintal,
        detectedUnit: f.detectedUnit,
        detectedQuantity: f.detectedQuantity,
        totalAmount: f.totalAmount,
        priceSource: f.priceSource,
      }),
      (v) => v.quantityInQuintal === null && v.pricePerQuintal === null
    ) || {
      quantityInQuintal: null,
      pricePerQuintal: null,
      detectedUnit: "",
      detectedQuantity: null,
      totalAmount: null,
      priceSource: "not found",
    };

  // Keep the notes from whichever pass produced the numbers we chose, so
  // the explanation the farmer reads matches the values on screen.
  const matchingPass =
    results.find(
      (r) =>
        r.fields.quantityInQuintal === money.quantityInQuintal &&
        r.fields.pricePerQuintal === money.pricePerQuintal
    ) || bestPass;

  const combined = { crop, mandiName, state, date, ...money };
  const fieldsFound = [
    crop,
    mandiName,
    state,
    date,
    money.quantityInQuintal,
    money.pricePerQuintal,
  ].filter((v) => v !== "" && v !== null && v !== undefined).length;

  return {
    rawOcrText: bestPass.text,
    ...combined,
    scanQuality: fieldsFound >= 5 ? "good" : fieldsFound >= 3 ? "partial" : "poor",
    fieldsFound,
    passesRun: results.length,
    scanNotes: matchingPass.fields.notes || [],
    notes: matchingPass.fields.notes || [],
  };
}

function emptyFields() {
  return {
    crop: "",
    mandiName: "",
    state: "",
    date: "",
    quantityInQuintal: null,
    pricePerQuintal: null,
    detectedUnit: "",
    detectedQuantity: null,
    totalAmount: null,
    notes: [],
  };
}

// =======================================================================
// PART 3 - TURNING TEXT INTO FIELDS
// =======================================================================

/**
 * The co-ordinator: runs each individual guesser and assembles the
 * result. Note that we pass the text in TWO forms:
 *
 *   lines - the text split into rows, layout preserved
 *   flat  - everything on one line, for simple "does this appear
 *           anywhere?" questions like finding the state
 *
 * Keeping the lines is what lets us tell a Weight column from a Rate
 * column, which the old version couldn't do.
 */
function extractFieldsFromText(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const flat = lines.join(" ");
  const notes = [];

  const crop = guessCrop(lines, flat);
  const state = guessState(lines, flat);
  const mandiName = guessMandiName(lines);
  const date = guessDate(lines, flat);

  // Quantity and price are worked out TOGETHER, because the price
  // usually has to be derived from the total and the quantity. See the
  // long comment above guessQuantityAndPrice() for why.
  const money = guessQuantityAndPrice(lines, flat, notes);

  return {
    crop,
    mandiName,
    state,
    date,
    quantityInQuintal: money.quantityInQuintal,
    pricePerQuintal: money.pricePerQuintal,
    // Extra context the review screen uses to explain what we did
    detectedUnit: money.detectedUnit,
    detectedQuantity: money.detectedQuantity,
    totalAmount: money.totalAmount,
    priceSource: money.priceSource,
    notes,
  };
}

// ---------------------------------------------------------------------
// FIELD 1: CROP
// ---------------------------------------------------------------------
// Strategy, in order of how much we trust it:
//   1. The line describing the goods (has a "Description"/"Commodity"
//      heading, or is the first line with both words and a price) -
//      this is where the crop name really lives on an invoice.
//   2. Anywhere in the whole text.
//   3. Whatever word follows a "Crop:" / "Commodity:" label, even if we
//      don't recognise it - an unusual crop we've never heard of is
//      still better than a blank box.
// ---------------------------------------------------------------------
function guessCrop(lines, flat) {
  // --- 1. Prefer the goods/description rows ---
  const goodsLines = lines.filter((line) => containsKeyword(line, KEYWORDS.goods));

  // Also treat "a line that starts with a serial number and contains
  // letters" as a goods row - that's the classic invoice item layout,
  // e.g. "1 DHANIYA MTP (CORIANDER) 09092190 350.00 ..."
  const itemLines = lines.filter((line) => /^\s*\d{1,2}[\s.)]+[A-Za-z]/.test(line));

  for (const line of [...goodsLines, ...itemLines]) {
    const match = findBestMatch(line, CROPS);
    if (match) return match.name;
  }

  // --- 2. Fall back to searching the entire receipt ---
  const anywhere = findBestMatch(flat, CROPS);
  if (anywhere) return anywhere.name;

  // --- 3. Last resort: trust an explicit label, whatever it says ---
  const labelled = flat.match(
    /(?:crop|commodity|item|produce|goods)\s*[:\-]\s*([A-Za-z][A-Za-z\s]{2,25})/i
  );
  if (labelled) {
    return titleCase(labelled[1].trim().split(/\s{2,}/)[0]);
  }

  return "";
}

// ---------------------------------------------------------------------
// FIELD 2: STATE
// ---------------------------------------------------------------------
function guessState(lines, flat) {
  // An explicit "State: Rajasthan" label is the most reliable signal,
  // so check those lines first.
  const stateLines = lines.filter((line) => /\bstate\b/i.test(line));
  for (const line of stateLines) {
    const match = findBestMatch(line, STATES);
    if (match) return match.name;
  }

  // Otherwise look anywhere - state names appear in addresses too.
  const anywhere = findBestMatch(flat, STATES);
  return anywhere ? anywhere.name : "";
}

// ---------------------------------------------------------------------
// FIELD 3: MANDI NAME
// ---------------------------------------------------------------------
// We look for a line containing "mandi" (or "APMC"/"market"/"bazar")
// and take the words immediately BEFORE it, which is how these names
// are written: "CHANDPOLE ANAJ MANDI", "Pune APMC".
//
// The old version grabbed a single word, so "Chandpole Anaj Mandi"
// became "Anaj Mandi". We now take up to three preceding words.
// ---------------------------------------------------------------------
function guessMandiName(lines) {
  const allMarkers = [...KEYWORDS.mandi, ...KEYWORDS.market];

  for (const line of lines) {
    if (!containsKeyword(line, allMarkers)) continue;

    // Find where the marker word sits in this line.
    const lowerLine = line.toLowerCase();
    const marker = allMarkers.find((m) => lowerLine.includes(m.toLowerCase()));
    if (!marker) continue;

    const markerIndex = lowerLine.indexOf(marker.toLowerCase());

    // --- Words BEFORE the marker, e.g. "CHANDPOLE ANAJ" + "MANDI" ---
    const before = line
      .slice(0, markerIndex)
      .replace(/[^A-Za-z\s]/g, " ") // drop digits/punctuation OCR added
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2) // skip stray single letters
      .slice(-3); // at most the last three words

    if (before.length > 0) {
      return `${titleCase(before.join(" "))} Mandi`;
    }

    // --- Nothing useful before it? Try AFTER, e.g. "Market: Pune" ---
    const after = line
      .slice(markerIndex + marker.length)
      .replace(/[^A-Za-z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 2);

    if (after.length > 0) {
      return `${titleCase(after.join(" "))} Mandi`;
    }
  }

  return "";
}

// ---------------------------------------------------------------------
// FIELDS 4 & 5: QUANTITY AND PRICE PER QUINTAL
// ---------------------------------------------------------------------
// These two are worked out TOGETHER, and that's the key design decision
// in this file. Here's why.
//
// On the real invoice we tested, the rate column was destroyed by OCR
// ("8,001.00" came out as "KO0IG0"). But the total and the weight both
// survived. Since
//
//      total  ÷  quantity  =  rate per quintal
//
// ...any two of those three numbers give you the third. So instead of
// hunting for each field separately and hoping, we:
//
//   1. Collect EVERY plausible quantity on the receipt (there are
//      usually several: gross weight, net weight, packing weight, bags).
//   2. Collect EVERY plausible money total (goods value, grand total).
//   3. Try each quantity against each total, and keep the combination
//      whose implied rate looks most like a real crop price.
//
// That last step is what makes this reliable. A packing weight of 150 kg
// paired with a ₹10 lakh total implies ₹7,14,756 per quintal, which is
// obviously wrong - so that pairing scores badly and loses to the
// 13,400 kg pairing, which implies ₹8,001. Which is exactly what the
// invoice actually says.
// ---------------------------------------------------------------------

// A typical Indian crop sells for somewhere between ₹500 and ₹30,000 a
// quintal. Results inside this band get a bonus when we're choosing
// between possible readings - outside it, they're probably a misread.
const TYPICAL_PRICE_LOW = 500;
const TYPICAL_PRICE_HIGH = 30000;

function guessQuantityAndPrice(lines, flat, notes) {
  // Find the money totals FIRST. The quantity hunter needs to know them,
  // so it can avoid mistaking a rupee figure for a weight.
  const amounts = collectAmountCandidates(lines);
  const amountValues = amounts.map((a) => a.value);

  const quantities = collectQuantityCandidates(lines, flat, amountValues);
  const printedRate = findPrintedRate(flat);

  // ---- The happy path: the receipt states the rate outright ----
  if (printedRate !== null) {
    // If we also found quantities, pick the one that best agrees with
    // the printed rate and total - a nice built-in consistency check.
    const bestQuantity = pickQuantityAgreeingWithRate(quantities, amounts, printedRate);

    describeQuantity(bestQuantity, notes);
    return {
      quantityInQuintal: bestQuantity ? bestQuantity.quintals : null,
      pricePerQuintal: Math.round(printedRate),
      detectedUnit: bestQuantity ? bestQuantity.unitLabel : "",
      detectedQuantity: bestQuantity ? bestQuantity.originalValue : null,
      totalAmount: amounts.length > 0 ? amounts[0].value : null,
      priceSource: "printed on the receipt",
    };
  }

  // ---- Otherwise: try every quantity against every total ----
  let best = null;

  for (const quantity of quantities) {
    for (const amount of amounts) {
      const rate = amount.value / quantity.quintals;
      if (!isSensiblePrice(rate)) continue; // throws out absurd pairings

      // Score the combination. Higher is better.
      let score = quantity.confidence + amount.confidence;

      // A rate in the normal range for Indian crops is a strong signal
      // that we picked the right pair of numbers.
      if (rate >= TYPICAL_PRICE_LOW && rate <= TYPICAL_PRICE_HIGH) {
        score += 60;
      }

      if (!best || score > best.score) {
        best = { score, quantity, amount, rate };
      }
    }
  }

  if (best) {
    describeQuantity(best.quantity, notes);
    notes.push(
      `Price per quintal was calculated: ₹${best.amount.value.toLocaleString("en-IN")} ÷ ` +
        `${best.quantity.quintals} quintals = ₹${Math.round(best.rate).toLocaleString("en-IN")}.`
    );

    return {
      quantityInQuintal: best.quantity.quintals,
      pricePerQuintal: Math.round(best.rate),
      detectedUnit: best.quantity.unitLabel,
      detectedQuantity: best.quantity.originalValue,
      totalAmount: best.amount.value,
      priceSource: "calculated from the total",
    };
  }

  // ---- Nothing paired up. Return whatever we DID manage to find ----
  // A quantity with no price is still useful - it saves typing one of
  // the two fields, and a blank price beats a wrong one.
  const fallbackQuantity = quantities.length > 0 ? quantities[0] : null;
  describeQuantity(fallbackQuantity, notes);

  const fallbackAmount = amounts.length > 0 ? amounts[0].value : null;
  if (fallbackAmount !== null && !fallbackQuantity) {
    notes.push(
      `Found a total of ₹${fallbackAmount.toLocaleString("en-IN")} but no quantity, ` +
        `so the price per quintal could not be worked out. Please enter it.`
    );
  }

  return {
    quantityInQuintal: fallbackQuantity ? fallbackQuantity.quintals : null,
    pricePerQuintal: null,
    detectedUnit: fallbackQuantity ? fallbackQuantity.unitLabel : "",
    detectedQuantity: fallbackQuantity ? fallbackQuantity.originalValue : null,
    totalAmount: fallbackAmount,
    priceSource: "not found",
  };
}

/**
 * Adds a note when the quantity involved a guess, so the farmer knows
 * which field deserves a second look on the review screen.
 */
function describeQuantity(quantity, notes) {
  if (quantity && quantity.assumed && quantity.note) {
    notes.push(`Quantity: ${quantity.note}. Please check it.`);
  }
}

/**
 * When the receipt printed a rate, use it to work out which candidate
 * quantity is the real one: the right quantity is the one where
 * rate x quantity actually equals one of the printed totals.
 */
function pickQuantityAgreeingWithRate(quantities, amounts, printedRate) {
  for (const quantity of quantities) {
    for (const amount of amounts) {
      const impliedRate = amount.value / quantity.quintals;
      // Within 5% counts as agreement - invoices round, and there are
      // usually small other charges mixed into the total.
      if (Math.abs(impliedRate - printedRate) / printedRate < 0.05) {
        return quantity;
      }
    }
  }
  return quantities.length > 0 ? quantities[0] : null;
}

// ---------------------------------------------------------------------
// Collecting the candidate QUANTITIES
// ---------------------------------------------------------------------
// This is the "scan any unit" requirement. Four sources, each given a
// confidence score so the chooser above knows which to trust:
//
//   A. A number with its unit printed next to it - "13400 KG", "25 Qtl",
//      "350 bags", "13.4 MT". Most reliable, so highest confidence.
//   B. A weight column or label with no unit - on Indian grain invoices
//      an unlabelled weight is always kilograms.
//   C. A summary "Total" row, which carries the totalled weight.
//   D. A bare "Qty: 25" with no unit anywhere - lowest confidence.
//
// Everything is converted to quintals (1 quintal = 100 kg), because
// that's the unit the rest of the app and the government API use.
// ---------------------------------------------------------------------
function collectQuantityCandidates(lines, flat, amountValues = []) {
  const candidates = [];

  // A number we've already identified as a rupee total can't also be a
  // weight, so we use this to rule those out.
  const isKnownAmount = (value) => amountValues.includes(value);

  // ---- A. A number immediately followed by a unit word ----
  for (const unit of UNITS) {
    for (const unitWord of unit.match) {
      const pattern = new RegExp(
        `([\\d][\\d,.]{0,12}?)\\s*${escapeRegex(unitWord)}\\b\\.?`,
        "gi"
      );

      let match;
      while ((match = pattern.exec(flat)) !== null) {
        const value = parseIndianNumber(match[1]);
        if (value === null) continue;

        const quintals = value * unit.toQuintal;
        if (!isSensibleQuantity(quintals)) continue;

        candidates.push({
          quintals: roundTo(quintals, 3),
          originalValue: value,
          unitLabel: unitWord,
          assumed: Boolean(unit.assumed),
          note: unit.note,
          confidence: unit.assumed ? 70 : 100,
        });
      }
    }
  }

  // ---- B. A weight label with no unit -> kilograms ----
  for (const line of lines) {
    if (!containsKeyword(line, KEYWORDS.weight)) continue;

    for (const numberText of extractNumbers(line)) {
      const value = parseIndianNumber(numberText);
      if (value === null || value < 10) continue; // ignore column numbers
      if (isKnownAmount(value)) continue; // that is a rupee total, not a weight

      const quintals = value * 0.01;
      if (!isSensibleQuantity(quintals)) continue;

      // Net weight is what was actually sold; gross includes the sacks,
      // so we trust net more when both appear on the same receipt.
      const isNet = /\bnet\b/i.test(line);
      const isGross = /\bgross\b/i.test(line);

      candidates.push({
        quintals: roundTo(quintals, 3),
        originalValue: value,
        unitLabel: "kg",
        assumed: true,
        note: "the weight column had no unit printed, so kilograms were assumed",
        confidence: isNet ? 68 : isGross ? 48 : 58,
      });
    }
  }

  // ---- C. The summary "Total" row ----
  // A line like "Total 350 13,400 Total 1,072,134.00" holds the totalled
  // bag count AND the totalled weight, side by side.
  //
  // We skip any number on it that we already know is a rupee total.
  // NOTE this used to just skip the LARGEST number on the line, which
  // was wrong: on a receipt where the amount sits on its own separate
  // line, the largest number in the total row IS the weight - and
  // dropping it left us reading "350" as the quantity instead of
  // "13,400", which threw the calculated price out by a factor of 38.
  for (const line of lines) {
    if (!/^\s*total\b/i.test(line)) continue;

    const numbers = extractNumbers(line)
      .map(parseIndianNumber)
      .filter((n) => n !== null);

    if (numbers.length < 2) continue;

    for (const value of numbers) {
      if (value < 10) continue;

      // A number we also saw as a rupee total MIGHT still be the weight -
      // on a row like "Total 350 13,400" it is genuinely ambiguous which
      // column is which. So rather than ruling it out, we keep it with a
      // lower confidence and let the quantity-vs-total pairing below work
      // out which reading actually produces a believable price.
      const alsoLooksLikeAnAmount = isKnownAmount(value);

      const quintals = value * 0.01; // treat as kilograms
      if (!isSensibleQuantity(quintals)) continue;

      candidates.push({
        quintals: roundTo(quintals, 3),
        originalValue: value,
        unitLabel: "kg",
        assumed: true,
        note: "taken from the receipt's total row and assumed to be kilograms",
        confidence: alsoLooksLikeAnAmount ? 55 : 62,
      });
    }
  }

  // ---- D. A bare "Qty: 25" with no unit anywhere ----
  const qtyMatch = flat.match(/\b(?:qty|quantity|maal)\s*[:\-]?\s*([\d][\d,.]{0,10})/i);
  if (qtyMatch) {
    const value = parseIndianNumber(qtyMatch[1]);
    if (value !== null && isSensibleQuantity(value)) {
      candidates.push({
        quintals: roundTo(value, 3),
        originalValue: value,
        unitLabel: "quintal",
        assumed: true,
        note: "no unit was printed, so quintals were assumed",
        confidence: 30,
      });
    }
  }

  // Most confident first; on a tie prefer the larger quantity, because
  // the headline weight on a receipt is bigger than any packing weight.
  candidates.sort((a, b) => b.confidence - a.confidence || b.quintals - a.quintals);
  return candidates;
}

// ---------------------------------------------------------------------
// Collecting the candidate TOTALS
// ---------------------------------------------------------------------
// We want the value of the GOODS, not the final payable figure. A grand
// total includes GST and other charges, which would inflate the rate we
// calculate from it - so labelled goods values score highest.
// ---------------------------------------------------------------------
function collectAmountCandidates(lines) {
  // IMPORTANT: these are checked in order of how SPECIFIC the wording is,
  // not in order of confidence. "Net Amount" has to be tested before plain
  // "Amount", because the words "Net Amount 11,42,400" contain "amount" -
  // so a plain "amount" test would match that line and wrongly treat the
  // grand total as the goods value. (That exact slip made the calculated
  // rate ₹8,525 instead of the ₹8,001 actually printed on the invoice.)
  //
  // Each line is assigned to the FIRST group it matches, and only that one.
  const labelGroups = [
    // Most specific wording first...
    { labels: ["taxable value", "taxable amount", "assessable value"], confidence: 100 },
    { labels: ["net amount", "grand total", "net payable", "total payable"], confidence: 50 },
    // ...then the looser words.
    { labels: ["amount", "value"], confidence: 80 },
    { labels: ["total"], confidence: 70 },
  ];

  const candidates = [];

  for (const line of lines) {
    const group = labelGroups.find((g) => containsKeyword(line, g.labels));
    if (!group) continue;

    // A money row usually carries several numbers (quantity, weight,
    // rate, amount). The amount is essentially always the largest.
    const rawNumbers = extractNumbers(line);
    const numbers = rawNumbers
      .map(parseIndianNumber)
      .filter((n) => n !== null && n >= MIN_SENSIBLE_PRICE);

    if (numbers.length === 0) continue;

    // Rupee figures on an invoice are printed to two decimal places
    // ("1,072,134.00"), whereas a column total of bags or kilos is a
    // whole number ("Total 350 13,400"). So if nothing on this line is
    // written like money, this probably is not the money row - we keep
    // it as a possibility, but trust it much less.
    const looksLikeMoney = rawNumbers.some((text) => /[.,]\d{2}$/.test(text));
    const confidence = looksLikeMoney ? group.confidence : Math.min(group.confidence, 40);

    candidates.push({ value: Math.max(...numbers), confidence });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

/**
 * Looks for a rate the receipt states outright, e.g. "@ 2,100 per
 * quintal", "Rate 8001/qtl", "Rs. 45 per kg". A per-kg rate is
 * multiplied by 100 to become a per-quintal rate.
 */
function findPrintedRate(flat) {
  const match = flat.match(
    /(?:@|rate|price|bhav|dar|rs\.?|inr|₹)?\s*([\d][\d,.]{1,10})\s*(?:\/|per\s+)\s*(quintal|qtl|qntl|ql|kg|kilo|kilogram)\b/i
  );
  if (!match) return null;

  const value = parseIndianNumber(match[1]);
  if (value === null) return null;

  const perQuintal = match[2].toLowerCase().startsWith("k") ? value * 100 : value;
  return isSensiblePrice(perQuintal) ? perQuintal : null;
}

// ---------------------------------------------------------------------
// FIELD 6: DATE
// ---------------------------------------------------------------------
// An invoice carries several dates (invoice date, e-way bill date,
// acknowledgement date, service date). We prefer a line that's clearly
// labelled, and only fall back to "the first date anywhere" if we must.
//
// We also reject impossible dates - a date far in the future is a
// misread invoice number, not a sale date.
// ---------------------------------------------------------------------
function guessDate(lines, flat) {
  // The invoice date is usually printed more than once (in the header,
  // next to the acknowledgement number, on the e-way bill line). OCR
  // might misread one of those copies, but it's unlikely to misread all
  // of them the SAME way - so we collect every date we can find and go
  // with whichever appears most often. This "voting" makes the result
  // far steadier than simply taking the first date we bump into.
  const votes = new Map();

  function castVote(isoDate, weight) {
    if (!isoDate) return;
    votes.set(isoDate, (votes.get(isoDate) || 0) + weight);
  }

  // --- Dates on a line that says "Date"/"Dated" count double ---
  const dateLines = lines.filter((line) =>
    /\b(?:date|dated|dt|invoice date|bill date|sale date)\b/i.test(line)
  );
  for (const line of dateLines) {
    for (const found of findAllDatesInText(line)) {
      castVote(found, 2);
    }
  }

  // --- Every other date on the receipt gets one vote ---
  for (const found of findAllDatesInText(flat)) {
    castVote(found, 1);
  }

  if (votes.size === 0) return "";

  // Highest vote count wins; if two tie, the earlier date wins, since a
  // receipt's own date comes before any due/delivery date printed on it.
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked[0][0];
}

/**
 * Pulls EVERY valid-looking date out of a piece of text, each formatted
 * as "YYYY-MM-DD" (the format an HTML <input type="date"> needs).
 *
 * Handles the three ways dates get printed on Indian receipts:
 *   25/11/2023, 25-11-2023, 25.11.2023, 25/11/23
 *   25 Nov 2023
 *   Nov 25, 2023
 */
function findAllDatesInText(text) {
  const MONTH_NAMES = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  const monthPattern = MONTH_NAMES.join("|");
  const found = [];

  // A two-digit year needs expanding: "23" -> 2023, "99" -> 1999.
  const expandYear = (year) => (year < 100 ? year + (year < 50 ? 2000 : 1900) : year);

  // --- Numeric: 25/11/2023 ---
  const numericPattern = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g;
  let match;
  while ((match = numericPattern.exec(text)) !== null) {
    const iso = buildIsoDate(expandYear(Number(match[3])), Number(match[2]), Number(match[1]));
    if (iso) found.push(iso);
  }

  // --- Written month, day first: "25 Nov 2023" ---
  const dayFirstPattern = new RegExp(
    `\\b(\\d{1,2})\\s*[-\\s]\\s*(${monthPattern})[a-z]*\\s*[-,\\s]\\s*(\\d{2,4})\\b`,
    "gi"
  );
  while ((match = dayFirstPattern.exec(text)) !== null) {
    const month = MONTH_NAMES.indexOf(match[2].toLowerCase()) + 1;
    const iso = buildIsoDate(expandYear(Number(match[3])), month, Number(match[1]));
    if (iso) found.push(iso);
  }

  // --- Written month first: "Nov 25, 2023" ---
  const monthFirstPattern = new RegExp(
    `\\b(${monthPattern})[a-z]*\\s+(\\d{1,2}),?\\s+(\\d{2,4})\\b`,
    "gi"
  );
  while ((match = monthFirstPattern.exec(text)) !== null) {
    const month = MONTH_NAMES.indexOf(match[1].toLowerCase()) + 1;
    const iso = buildIsoDate(expandYear(Number(match[3])), month, Number(match[2]));
    if (iso) found.push(iso);
  }

  return found;
}

/**
 * Validates a date and formats it as "YYYY-MM-DD", or returns null if
 * it isn't a real, plausible sale date.
 */
function buildIsoDate(year, month, day) {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // A receipt from before 2000, or more than a year in the future, is
  // certainly a misread rather than a real sale date.
  const currentYear = new Date().getFullYear();
  if (year < 2000 || year > currentYear + 1) return null;

  // Catch things like 31 February - the Date object silently rolls them
  // over to March, so we check it kept the month we asked for.
  const asDate = new Date(year, month - 1, day);
  if (asDate.getMonth() !== month - 1 || asDate.getDate() !== day) return null;

  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

// =======================================================================
// PART 4 - SMALL SHARED HELPERS
// =======================================================================

/**
 * Turns the number strings OCR produces into real JavaScript numbers.
 *
 * This is fiddlier than it sounds, because OCR regularly confuses "." and
 * "," - a real invoice showed "13,400.00" as "13.400.00". So rather than
 * trusting the separators, we work out what they must have meant:
 *
 *   "1,072,134.00" -> 1072134    (commas = thousands, final dot = paise)
 *   "13.400.00"    -> 13400      (two dots: OCR read a comma as a dot)
 *   "13,400"       -> 13400      (one comma + 3 digits = thousands)
 *   "150.000"      -> 150        (one DOT + 3 digits = a 3-decimal weight)
 *   "350.00"       -> 350
 *   "13.4"         -> 13.4
 *
 * That "150.000" case is the subtle one, and it caused a real bug: Indian
 * invoices print weights to three decimal places, so "150.000" means one
 * hundred and fifty kilos - NOT one hundred and fifty thousand. Treating
 * the dot as a thousands separator inflated the quantity a thousandfold
 * and made the calculated price per quintal nonsense.
 *
 * The rule that sorts it out: a COMMA before three digits is a thousands
 * separator, but a lone DOT is always a decimal point.
 */
function parseIndianNumber(text) {
  if (text === null || text === undefined) return null;

  let cleaned = String(text).replace(/[^\d.,]/g, "").trim();
  // Strip separators stuck on either end ("13,400." -> "13,400")
  cleaned = cleaned.replace(/^[.,]+|[.,]+$/g, "");
  if (!cleaned) return null;

  const toNumber = (value) => (Number.isFinite(value) ? value : null);

  const separators = cleaned.match(/[.,]/g) || [];
  if (separators.length === 0) {
    return toNumber(Number(cleaned));
  }

  const lastIndex = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  const lastSeparator = cleaned[lastIndex];
  const tail = cleaned.slice(lastIndex + 1);

  // --- More than one separator ---
  // e.g. "1,072,134.00" or "13.400.00". If the final group is 1-2 digits
  // it's the decimal part; otherwise every separator marks thousands.
  if (separators.length > 1) {
    if (tail.length <= 2) {
      const wholePart = cleaned.slice(0, lastIndex).replace(/[.,]/g, "");
      return toNumber(Number(`${wholePart}.${tail}`));
    }
    return toNumber(Number(cleaned.replace(/[.,]/g, "")));
  }

  // --- Exactly one separator ---
  if (lastSeparator === ",") {
    // A comma followed by exactly 3 digits is a thousands separator.
    if (tail.length === 3) return toNumber(Number(cleaned.replace(/,/g, "")));
    // Anything else ("2,5") is a decimal comma.
    return toNumber(Number(cleaned.replace(",", ".")));
  }

  // A lone dot is a decimal point - see the note above about "150.000".
  return toNumber(Number(cleaned));
}

/**
 * Pulls every number-looking chunk out of a line of text, so we can
 * test each one in turn.
 */
function extractNumbers(line) {
  return line.match(/\d[\d,.]*/g) || [];
}

function isSensiblePrice(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_SENSIBLE_PRICE &&
    value <= MAX_SENSIBLE_PRICE
  );
}

function isSensibleQuantity(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_SENSIBLE_QUANTITY &&
    value <= MAX_SENSIBLE_QUANTITY
  );
}

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** "CHANDPOLE ANAJ" -> "Chandpole Anaj" */
function titleCase(text) {
  return String(text)
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

/** Makes a string safe to drop into a regular expression. */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  extractReceiptDetails,
  // Exposed so backend/_unittest.js can test the TEXT-PARSING rules
  // directly, without having to render and OCR an image every time.
  // Not used by the app itself.
  __parseTextForTests: extractFieldsFromText,
};
