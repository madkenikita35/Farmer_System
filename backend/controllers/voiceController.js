// controllers/voiceController.js
// -----------------------------------------------------------------------
// The brain behind the voice assistant.
//
//   transcript in  ->  intent + entities  ->  real mandi data
//                  ->  a sentence in the SAME language, ready to speak
//
// The browser does the listening and the speaking. This decides what to
// say. Splitting it that way means the difficult part - understanding
// the question and looking up honest numbers - is testable with plain
// HTTP, without needing a microphone.
//
// EVERY REPLY COMES BACK IN TWO FORMS:
//   reply  - one natural sentence, for SpeechSynthesis to read aloud
//   data   - the structured numbers, for the on-screen transcript
//
// That matters more than it looks. Several Indian languages have no TTS
// voice installed on many devices (Marathi especially). When there's no
// voice to speak with, the screen still shows the answer.
// -----------------------------------------------------------------------

const { parseVoiceQuery } = require("../services/voiceIntentService");
const { REPLIES, cropDisplayName } = require("../config/voicePhrases");
const {
  spokenRupees,
  spokenDate,
  spokenState,
  spokenMandiName,
  numberToWords,
} = require("../config/spokenForms");
const { fetchMandiPrices } = require("../services/mandiApiService");
const { getMandiDirectory } = require("../services/mandiDirectoryService");
const {
  distanceInKm,
  findMandiLocation,
  geocodePlace,
} = require("../services/locationService");
const { logActivity } = require("../services/activityService");

// How far "near me" reaches, in km. Same default as the Near Me page,
// so the two features can't disagree with each other.
const NEARBY_RADIUS_KM = 150;

// Below this, speech recognition is guessing. Acting on a guess gives
// the farmer a confident answer to a question they never asked, which is
// worse than admitting we didn't hear. See the note in handleVoiceQuery.
const MIN_CONFIDENCE = 0.5;

/**
 * Picks the reply set for a language, falling back to English if we
 * somehow get a language we don't speak.
 */
function repliesFor(language) {
  return REPLIES[language] || REPLIES.en;
}

// ---------------------------------------------------------------------
// POST /api/voice/query
//
// Body: {
//   transcript: "what is the price of onion",
//   language:   "en-IN",        // what the browser was listening in
//   confidence: 0.92,           // from the recognition result
//   lat, lon,                   // optional, for "near me"
//   context: { crop, intent }   // from the previous turn
// }
// ---------------------------------------------------------------------
async function handleVoiceQuery(req, res) {
  try {
    const { transcript, language: languageHint, confidence, lat, lon, context } =
      req.body || {};

    if (typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ message: "No transcript was provided." });
    }

    const parsed = parseVoiceQuery(transcript, languageHint, context || {});
    const say = repliesFor(parsed.language);

    // ---- LOW CONFIDENCE: ask again rather than guess ----
    // Recognition confidence collapses in a noisy field, and Indian
    // language models are weaker than English ones to begin with. A
    // wrong-but-confident answer about money is the worst outcome here,
    // so below the threshold we simply ask them to repeat.
    //
    // Exception: if we still managed to pull a crop out of it, the
    // transcript was probably good enough to act on.
    const numericConfidence = Number(confidence);
    if (
      Number.isFinite(numericConfidence) &&
      numericConfidence > 0 &&
      numericConfidence < MIN_CONFIDENCE &&
      !parsed.crop
    ) {
      return res.status(200).json({
        language: parsed.language,
        intent: "low_confidence",
        reply: say.lowConfidence,
        data: null,
        context: context || {},
        needsClarification: true,
        heardConfidence: numericConfidence,
      });
    }

    // ---- Conversational odds and ends ----
    if (parsed.intent === "greeting") {
      return respond(res, parsed, say.greeting, null, context);
    }
    if (parsed.intent === "goodbye") {
      return respond(res, parsed, say.goodbye, null, context, { endSession: true });
    }

    // ---- Arrival quantity: recognised, but we genuinely don't have it ----
    // The government price resource publishes prices only - there is no
    // arrival/volume field in it - and Agmarknet's own arrivals report
    // sits behind a CAPTCHA. Rather than silently failing or inventing a
    // number, the assistant says plainly that it can't answer this one.
    if (parsed.intent === "arrival") {
      return respond(
        res,
        parsed,
        say.arrivalUnavailable(cropDisplayName(parsed.crop, parsed.language)),
        { unavailable: "arrival_quantity" },
        context
      );
    }

    // ---- "Which mandi is nearest?" needs no crop at all ----
    // Asked on its own this is a question about GEOGRAPHY, not prices,
    // and the mandi directory answers it directly. It used to fall into
    // the "everything else needs a crop" guard below and come back with
    // "which crop would you like?" - which reads as the assistant
    // dodging a perfectly clear question.
    if (parsed.intent === "nearest" && !parsed.crop) {
      return await answerNearestMandis(res, parsed, say, { lat, lon }, context);
    }

    // ---- Everything else needs a crop ----
    if (!parsed.crop) {
      const reply = parsed.intent === "unknown" ? say.clarify : say.noCrop;
      return respond(res, parsed, reply, null, context, { needsClarification: true });
    }

    // ---- Fetch the prices once; all three intents work off this ----
    const government = await fetchMandiPrices(parsed.crop, null, { limit: 2000 });
    const priced = government.prices.filter((p) => p.modalPrice > 0);

    if (priced.length === 0) {
      return respond(res, parsed, say.noData(cropDisplayName(parsed.crop, parsed.language)), null, context);
    }

    if (parsed.intent === "nearest") {
      return await answerNearest(res, parsed, say, priced, { lat, lon }, context);
    }

    if (parsed.intent === "price" && (parsed.place || parsed.state)) {
      return answerPriceAtPlace(res, parsed, say, priced, context);
    }

    // "highest", and any plain price question with no place named.
    return answerHighest(res, parsed, say, priced, government.matchedDate, context);
  } catch (error) {
    console.error("Error handling voice query:", error);
    res.status(500).json({ message: "Failed to handle that voice query." });
  }
}

// ---------------------------------------------------------------------
// INTENT: highest price anywhere
// ---------------------------------------------------------------------
function answerHighest(res, parsed, say, priced, matchedDate, context) {
  const best = priced.reduce((a, b) => (b.modalPrice > a.modalPrice ? b : a));

  return respond(
    res,
    parsed,
    // SPOKEN FORMS: every value below is converted to words in the
    // spoken language before it reaches the sentence. Feeding raw
    // "11,250" and "16/09/2026" to SpeechSynthesis made the engine drop
    // out of Marathi to read them. See config/spokenForms.js.
    say.highestPrice(
      cropDisplayName(parsed.crop, parsed.language),
      spokenMandiName(best.market, parsed.language),
      spokenState(best.state, parsed.language),
      spokenRupees(best.modalPrice, parsed.language),
      spokenDate(matchedDate, parsed.language)
    ),
    {
      crop: parsed.crop,
      mandiName: best.market,
      district: best.district,
      state: best.state,
      modalPrice: best.modalPrice,
      minPrice: best.minPrice,
      maxPrice: best.maxPrice,
      arrivalDate: best.arrivalDate,
      mandisCompared: priced.length,
    },
    context,
    { mandi: best.market }
  );
}

// ---------------------------------------------------------------------
// Where is the farmer standing?
// ---------------------------------------------------------------------
/**
 * GPS if the browser gave it to us, otherwise a place name they spoke
 * ("near Nashik"). Returns null when we have neither, which the callers
 * turn into "please allow location access, or tell me your district".
 */
async function resolveOrigin(coords, parsed) {
  const latNumber = Number(coords.lat);
  const lonNumber = Number(coords.lon);
  if (Number.isFinite(latNumber) && Number.isFinite(lonNumber)) {
    return { lat: latNumber, lon: lonNumber };
  }

  if (parsed.place || parsed.state) {
    const found = await geocodePlace(parsed.place || parsed.state);
    if (found) return { lat: found.lat, lon: found.lon };
  }

  return null;
}

// ---------------------------------------------------------------------
// INTENT: nearest mandi, no crop named
// ---------------------------------------------------------------------
/**
 * Answers "which mandi is nearest to me?" on its own terms, from the
 * mandi directory rather than the price feed - no crop needed. It then
 * asks which crop they want, so the conversation carries on naturally
 * into a price question.
 */
async function answerNearestMandis(res, parsed, say, coords, context) {
  const origin = await resolveOrigin(coords, parsed);

  if (!origin) {
    return respond(res, parsed, say.needLocation, null, context, {
      needsClarification: true,
      needsLocation: true,
    });
  }

  const directory = await getMandiDirectory();

  const located = [];
  for (const mandi of directory.mandis || []) {
    const location = findMandiLocation(mandi.state, mandi.district);
    if (!location) continue;
    located.push({
      ...mandi,
      distanceKm: Math.round(distanceInKm(origin, location) * 10) / 10,
    });
  }

  if (located.length === 0) {
    // We could not place a single mandi on the map, so there is no
    // honest distance to give. Fall back to the old behaviour of asking
    // for the crop.
    return respond(res, parsed, say.noCrop, null, context, { needsClarification: true });
  }

  located.sort((a, b) => a.distanceKm - b.distanceKm);
  const closest = located[0];
  const nearbyCount = located.filter((m) => m.distanceKm <= NEARBY_RADIUS_KM).length;

  return respond(
    res,
    parsed,
    say.nearestMandiList(
      spokenMandiName(closest.mandiName, parsed.language),
      spokenPlaceLabel((closest.district || closest.state || "").trim(), parsed.language),
      numberToWords(Math.round(closest.distanceKm), parsed.language),
      // Null for 0 AND for 1, so the template drops the clause rather
      // than saying "zero mandis" or "one mandis". All three languages
      // use a plural noun in that sentence, and when the count is 1 the
      // clause adds nothing anyway - we just named that one mandi.
      nearbyCount > 1 ? numberToWords(nearbyCount, parsed.language) : null,
      numberToWords(NEARBY_RADIUS_KM, parsed.language)
    ),
    {
      mandiName: closest.mandiName,
      district: closest.district,
      state: closest.state,
      distanceKm: closest.distanceKm,
      radiusKm: NEARBY_RADIUS_KM,
      mandisNearby: nearbyCount,
      cropCount: closest.cropCount,
      // The next few, so the screen can show a short ranked list.
      alternatives: located.slice(1, 4).map((m) => ({
        mandiName: m.mandiName,
        district: m.district,
        state: m.state,
        distanceKm: m.distanceKm,
      })),
    },
    context,
    { mandi: closest.mandiName, needsClarification: true }
  );
}

// ---------------------------------------------------------------------
// INTENT: best price near me
// ---------------------------------------------------------------------
async function answerNearest(res, parsed, say, priced, coords, context) {
  const origin = await resolveOrigin(coords, parsed);

  if (!origin) {
    return respond(res, parsed, say.needLocation, null, context, {
      needsClarification: true,
      needsLocation: true,
    });
  }

  // Put every priced mandi we can locate on the map. Mandis whose
  // district we have no coordinates for are skipped - we cannot honestly
  // say how far away they are.
  const located = [];
  for (const price of priced) {
    const location = findMandiLocation(price.state, price.district);
    if (!location) continue;

    const km = distanceInKm(origin, location);
    located.push({ ...price, distanceKm: Math.round(km * 10) / 10 });
  }

  const withDistance = located.filter((m) => m.distanceKm <= NEARBY_RADIUS_KM);

  if (withDistance.length === 0) {
    // Nothing within the radius today. This happens often and for a real
    // reason: the government feed only carries the mandis that reported
    // that day, and whole states are frequently absent.
    //
    // This branch used to answer with the national best price and say
    // nothing about having done so. The farmer asked "which mandi is
    // nearest to me" and heard a highest-price sentence about a state
    // 900 km away - indistinguishable from the assistant repeating the
    // answer to their PREVIOUS question. That was the bug.
    //
    // Now we say plainly that nothing is nearby, then answer the
    // question actually asked: the nearest mandi that DID report, with
    // its real distance.
    if (located.length === 0) {
      // Not one mandi in today's data has a district we hold
      // coordinates for, so no distance can be given at all. The
      // national best is the only thing left to offer.
      return answerHighest(res, parsed, say, priced, null, context);
    }

    const closest = located.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a));

    return respond(
      res,
      parsed,
      say.noneNearby(
        cropDisplayName(parsed.crop, parsed.language),
        numberToWords(NEARBY_RADIUS_KM, parsed.language),
        spokenMandiName(closest.market, parsed.language),
        spokenState(closest.state, parsed.language),
        spokenRupees(closest.modalPrice, parsed.language),
        numberToWords(Math.round(closest.distanceKm), parsed.language)
      ),
      {
        crop: parsed.crop,
        mandiName: closest.market,
        district: closest.district,
        state: closest.state,
        modalPrice: closest.modalPrice,
        distanceKm: closest.distanceKm,
        radiusKm: NEARBY_RADIUS_KM,
        mandisNearby: 0,
        // Tells the screen (and anyone reading the JSON) that this is a
        // "nothing nearby" answer, not a normal nearest-mandi one.
        noneWithinRadius: true,
      },
      context,
      { mandi: closest.market }
    );
  }

  const best = withDistance.reduce((a, b) => (b.modalPrice > a.modalPrice ? b : a));

  return respond(
    res,
    parsed,
    say.nearestBest(
      cropDisplayName(parsed.crop, parsed.language),
      spokenMandiName(best.market, parsed.language),
      spokenRupees(best.modalPrice, parsed.language),
      numberToWords(Math.round(best.distanceKm), parsed.language)
    ),
    {
      crop: parsed.crop,
      mandiName: best.market,
      district: best.district,
      state: best.state,
      modalPrice: best.modalPrice,
      distanceKm: best.distanceKm,
      radiusKm: NEARBY_RADIUS_KM,
      mandisNearby: withDistance.length,
      // The next few, so the screen can show a short ranked list.
      alternatives: [...withDistance]
        .sort((a, b) => b.modalPrice - a.modalPrice)
        .slice(1, 4)
        .map((m) => ({
          mandiName: m.market,
          modalPrice: m.modalPrice,
          distanceKm: m.distanceKm,
        })),
    },
    context,
    { mandi: best.market }
  );
}

// ---------------------------------------------------------------------
// INTENT: price of X in <place>
// ---------------------------------------------------------------------
function answerPriceAtPlace(res, parsed, say, priced, context) {
  const wanted = (parsed.place || parsed.state || "").toLowerCase();

  // A spoken place could be a mandi, a district or a state, and the
  // farmer won't say which - so match against all three.
  const matches = priced.filter((p) => {
    const haystack = `${p.market} ${p.district} ${p.state}`.toLowerCase();
    return haystack.includes(wanted);
  });

  if (matches.length === 0) {
    return respond(
      res,
      parsed,
      say.noPlaceData(cropDisplayName(parsed.crop, parsed.language), parsed.place || parsed.state),
      null,
      context,
      { needsClarification: true }
    );
  }

  const average = Math.round(
    matches.reduce((sum, m) => sum + m.modalPrice, 0) / matches.length
  );

  // One mandi -> name it. Several -> report the average across them,
  // which is the honest summary of "the price in that district".
  const placeLabel = matches.length === 1 ? matches[0].market : parsed.place || parsed.state;

  return respond(
    res,
    parsed,
    say.priceAt(
      cropDisplayName(parsed.crop, parsed.language),
      spokenPlaceLabel(placeLabel, parsed.language),
      spokenRupees(average, parsed.language)
    ),
    {
      crop: parsed.crop,
      place: placeLabel,
      averagePrice: average,
      mandisMatched: matches.length,
      mandis: matches.slice(0, 5).map((m) => ({
        mandiName: m.market,
        district: m.district,
        state: m.state,
        modalPrice: m.modalPrice,
      })),
    },
    context,
    { mandi: matches[0].market }
  );
}

/**
 * A spoken place label. It may be a mandi name we matched, or the words
 * the farmer said ("Indore"), so we try the state list first and fall
 * back to mandi-name cleanup.
 */
function spokenPlaceLabel(label, language) {
  if (!label || language === "en") return label;
  const asState = spokenState(label, language);
  if (asState !== label) return asState;
  return spokenMandiName(label, language);
}

// ---------------------------------------------------------------------
// One place that shapes every response, so the contract can't drift
// between the seven or so places that reply.
// ---------------------------------------------------------------------
function respond(res, parsed, reply, data, previousContext, extras = {}) {
  const { mandi, ...rest } = extras;

  return res.status(200).json({
    language: parsed.language,
    intent: parsed.intent,
    entities: {
      crop: parsed.crop,
      state: parsed.state,
      place: parsed.place,
    },
    reply,
    data,
    // Handed back so the browser can send it with the NEXT question -
    // this is what makes "and what about tomato?" work.
    context: {
      ...(previousContext || {}),
      crop: parsed.crop || (previousContext || {}).crop || null,
      intent: parsed.intent === "unknown" ? (previousContext || {}).intent : parsed.intent,
      mandi: mandi || (previousContext || {}).mandi || null,
    },
    usedContext: parsed.usedContext,
    needsClarification: false,
    ...rest,
  });
}

module.exports = { handleVoiceQuery };
