// buildDistrictCoordinates.js
// -----------------------------------------------------------------------
// A ONE-TIME TOOL. You do not need to run this to use the app - its
// output, config/districtCoordinates.json, is already saved in the repo.
//
// Run it only when you want to refresh the coordinates:
//
//     cd backend
//     node buildDistrictCoordinates.js
//
// ---------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------
// The "nearest mandi" feature needs to know WHERE each mandi is. But the
// government price dataset only gives us names - state, district and
// market - and no latitude or longitude at all.
//
// So we look the districts up once, on OpenStreetMap's free geocoding
// service (Nominatim), and save the answers to a file. The running app
// then just reads that file: no API key, no network call, and no waiting
// while a farmer is looking at the screen.
//
// WHY NOT LOOK THEM UP WHILE THE APP IS RUNNING?
// Nominatim asks callers to make at most ONE request per second. With
// ~345 districts that is about seven minutes - fine as a one-off build
// step, hopeless inside a web request. Doing it once and shipping the
// result is the standard way to handle this.
//
// WHAT IF A DISTRICT CANNOT BE FOUND?
// Some districts in the dataset have names Nominatim doesn't recognise
// (renamed districts, or entries like "Dr.B.R.A.Konaseema"). For those we
// fall back to the centre of the STATE. That is obviously less precise -
// so we record `accuracy: "state"` alongside it, and the app tells the
// farmer when a distance is approximate rather than pretending it is exact.
// -----------------------------------------------------------------------

require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { STATE_CENTRES } = require("./config/stateCentres");

// Nominatim's usage policy requires a real User-Agent identifying the app,
// and no more than one request per second. Both are honoured below.
const USER_AGENT = "MandiPriceChecker/1.0 (student learning project)";
const DELAY_BETWEEN_REQUESTS_MS = 1200;

const OUTPUT_PATH = path.join(__dirname, "config", "districtCoordinates.json");

/** Pauses for a given number of milliseconds. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Downloads a large batch of price records and returns every distinct
 * (state, district) pair in it - i.e. exactly the places we need
 * coordinates for, and no more.
 */
async function fetchDistinctDistricts() {
  const apiKey = process.env.MANDI_API_KEY;
  const resourceId = process.env.MANDI_RESOURCE_ID;

  if (!apiKey) {
    throw new Error("MANDI_API_KEY is not set in .env - cannot fetch districts.");
  }

  console.log("Downloading the mandi dataset...");
  const response = await axios.get(`https://api.data.gov.in/resource/${resourceId}`, {
    params: { "api-key": apiKey, format: "json", limit: 10000 },
    timeout: 120000,
  });

  const records = response.data.records || [];
  console.log(`  got ${records.length} records`);

  // A Map keyed by "state|||district" removes duplicates for us.
  const pairs = new Map();
  for (const record of records) {
    const state = (record.state || "").trim();
    const district = (record.district || "").trim();
    if (!state || !district) continue;
    pairs.set(`${state}|||${district}`, { state, district });
  }

  return [...pairs.values()];
}

/**
 * Asks Nominatim where one district is. Returns null if it has no idea.
 */
async function geocode(district, state) {
  const query = `${district}, ${state}, India`;

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { format: "json", limit: 1, q: query, countrycodes: "in" },
      headers: { "User-Agent": USER_AGENT },
      timeout: 20000,
    });

    const results = response.data;
    if (!Array.isArray(results) || results.length === 0) return null;

    return {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon),
    };
  } catch (error) {
    console.warn(`    request failed for "${query}": ${error.message}`);
    return null;
  }
}

async function main() {
  const districts = await fetchDistinctDistricts();
  console.log(`Need coordinates for ${districts.length} districts.`);
  console.log(
    `At ${DELAY_BETWEEN_REQUESTS_MS}ms per request this takes about ` +
      `${Math.ceil((districts.length * DELAY_BETWEEN_REQUESTS_MS) / 60000)} minutes.\n`
  );

  // If we've built this before, reuse what we already found so a re-run
  // only looks up the districts that are actually new.
  let existing = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    console.log(`Reusing ${Object.keys(existing).length} coordinates already saved.\n`);
  }

  const result = { ...existing };
  let looked_up = 0;
  let fellBackToState = 0;
  let reused = 0;

  for (let i = 0; i < districts.length; i++) {
    const { state, district } = districts[i];
    const key = `${state}|||${district}`;

    if (result[key]) {
      reused++;
      continue;
    }

    const found = await geocode(district, state);

    if (found) {
      result[key] = { ...found, accuracy: "district" };
      looked_up++;
      console.log(`[${i + 1}/${districts.length}] ${district}, ${state} -> ${found.lat}, ${found.lon}`);
    } else {
      // Fall back to the middle of the state.
      const centre = STATE_CENTRES[state];
      if (centre) {
        result[key] = { lat: centre.lat, lon: centre.lon, accuracy: "state" };
        fellBackToState++;
        console.log(`[${i + 1}/${districts.length}] ${district}, ${state} -> (state centre)`);
      } else {
        console.log(`[${i + 1}/${districts.length}] ${district}, ${state} -> NOT FOUND, skipped`);
      }
    }

    // Be polite to a free service we don't pay for.
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 1), "utf8");

  console.log(`\nDone.`);
  console.log(`  looked up now      : ${looked_up}`);
  console.log(`  state-centre guess : ${fellBackToState}`);
  console.log(`  already had        : ${reused}`);
  console.log(`  total saved        : ${Object.keys(result).length}`);
  console.log(`  written to         : ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Build failed:", error.message);
  process.exit(1);
});
