// services/voiceIntentService.js
// -----------------------------------------------------------------------
// Turns what a farmer SAID into something the app can act on.
//
//   "मला कांद्याचा सर्वात जास्त भाव सांगा"
//        ->  { intent: "highest", crop: "Onion", language: "mr" }
//
// That's the whole job of this file: transcript in, structured intent
// out. Fetching the actual prices happens in controllers/voiceController.js.
//
// =======================================================================
// WHY NOT REUSE services/fuzzyMatch.js?
// =======================================================================
// It's excellent at what it does - matching OCR text against the crop
// list, forgiving misread letters. But its toWords() helper starts with
//
//     .replace(/[^a-z0-9\s]/g, " ")
//
// which deletes every character outside the Latin alphabet. Hand it
// "कांदा" and it returns an empty string. That's correct for OCR, which
// only ever sees Latin text off a printed receipt - and useless here,
// because speech recognition in mr-IN returns Devanagari.
//
// So this file does its own matching, in a way that handles both
// scripts. It still uses the CROPS list from config/ocrDictionaries.js
// for the English and romanised names, and adds the Devanagari names
// from config/voicePhrases.js on top. A farmer can say "onion", "kanda"
// or "कांदा" and all three arrive at Onion.
// =======================================================================

const { CROPS, STATES } = require("../config/ocrDictionaries");
const {
  CROP_NAMES_DEVANAGARI,
  INTENT_KEYWORDS,
  PLACE_CONNECTORS,
} = require("../config/voicePhrases");

// ---------------------------------------------------------------------
// Build one lookup table of every name a crop might be spoken as.
// ---------------------------------------------------------------------
// Done once when the server starts, not per request. The result maps a
// spoken name -> the English crop name the government dataset uses:
//
//     "कांदा" -> "Onion",  "kanda" -> "Onion",  "onion" -> "Onion"
//
// Sorted longest-first, because "lal mirch" must be tested before
// "mirch" - otherwise the longer, more specific name never matches.
function buildCropLookup() {
  const lookup = new Map();

  function add(spokenName, englishName) {
    const key = spokenName.toLowerCase().trim();
    if (key) lookup.set(key, englishName);
  }

  // English names + romanised aliases, from the OCR dictionary.
  for (const crop of CROPS) {
    add(crop.name, crop.name);
    for (const alias of crop.aliases || []) add(alias, crop.name);
  }

  // Devanagari names, from the voice dictionary.
  for (const [englishName, spokenNames] of Object.entries(CROP_NAMES_DEVANAGARI)) {
    for (const spoken of spokenNames) add(spoken, englishName);
  }

  // Longest first - see the note above.
  return [...lookup.entries()].sort((a, b) => b[0].length - a[0].length);
}

const CROP_LOOKUP = buildCropLookup();

// The same idea for state names, so "in Maharashtra" resolves.
function buildStateLookup() {
  const lookup = new Map();
  const devanagariStates = {
    Maharashtra: ["महाराष्ट्र"],
    "Madhya Pradesh": ["मध्य प्रदेश", "मध्यप्रदेश"],
    "Uttar Pradesh": ["उत्तर प्रदेश", "उत्तरप्रदेश"],
    Rajasthan: ["राजस्थान"],
    Gujarat: ["गुजरात"],
    Punjab: ["पंजाब"],
    Haryana: ["हरियाणा"],
    Karnataka: ["कर्नाटक"],
    Bihar: ["बिहार"],
    "West Bengal": ["पश्चिम बंगाल"],
    "Tamil Nadu": ["तमिलनाडु"],
    Telangana: ["तेलंगाना"],
    "Andhra Pradesh": ["आंध्र प्रदेश"],
    Odisha: ["ओडिशा"],
    Kerala: ["केरळ", "केरल"],
    Delhi: ["दिल्ली"],
  };

  for (const state of STATES) {
    lookup.set(state.name.toLowerCase(), state.name);
    for (const alias of state.aliases || []) lookup.set(alias.toLowerCase(), state.name);
  }
  for (const [englishName, spokenNames] of Object.entries(devanagariStates)) {
    for (const spoken of spokenNames) lookup.set(spoken.toLowerCase(), englishName);
  }

  return [...lookup.entries()].sort((a, b) => b[0].length - a[0].length);
}

const STATE_LOOKUP = buildStateLookup();

// =======================================================================
// LANGUAGE
// =======================================================================

/**
 * Which of our three languages is this transcript in?
 *
 * The browser tells us which language it was listening in, and that's
 * usually right - but not always: a farmer can pick Marathi and then
 * speak English, or the page can guess wrong from navigator.language.
 * So we also look at the SCRIPT, which is unambiguous.
 *
 * Devanagari alone can't separate Hindi from Marathi (they share the
 * script), so for that we trust the browser's hint, defaulting to Hindi.
 */
function detectLanguage(transcript, browserLanguageHint) {
  const hint = (browserLanguageHint || "").toLowerCase();

  // ऀ-ॿ is the Devanagari block.
  const hasDevanagari = /[ऀ-ॿ]/.test(transcript || "");

  if (hasDevanagari) {
    if (hint.startsWith("mr")) return "mr";
    if (hint.startsWith("hi")) return "hi";
    return "hi"; // Devanagari with no usable hint - Hindi is the safer default
  }

  // No Devanagari: the words are in Latin script, so English, unless the
  // browser insists otherwise AND we found a romanised local crop name.
  if (hint.startsWith("mr")) return "mr";
  if (hint.startsWith("hi")) return "hi";
  return "en";
}

// =======================================================================
// INTENT
// =======================================================================

/**
 * Does the transcript contain any of these phrases?
 *
 * SHORT phrases must match a whole word; longer ones may match as a
 * substring.
 *
 * That distinction is not fussiness - it was a real bug. The Hindi word
 * for "enough" is "बस", and the Hindi for "most" is "सबसे", which
 * CONTAINS बस. So "प्याज का सबसे ज्यादा भाव" - probably the single most
 * common question this assistant will ever be asked - was being read as
 * "goodbye", and it hung up on the farmer.
 *
 * JavaScript's \b word boundary only understands ASCII, so it is no help
 * with Devanagari. We compare whole whitespace-separated tokens instead,
 * which works in any script.
 */
const WHOLE_WORD_MAX_LENGTH = 4;

function containsAny(text, phrases) {
  const words = text.split(/\s+/).filter(Boolean);

  return phrases.some((phrase) => {
    const needle = phrase.toLowerCase();

    if (needle.length <= WHOLE_WORD_MAX_LENGTH && !needle.includes(" ")) {
      // Strip trailing punctuation so "बस।" still matches "बस".
      return words.some((word) => word.replace(/[.,!?।]/g, "") === needle);
    }

    return text.includes(needle);
  });
}

/**
 * Which question is being asked?
 *
 * ORDER IS DELIBERATE. "nearest mandi with the best price for tomato"
 * contains both "nearest" and "best price". Testing `nearest` first
 * means that sentence is treated as a location question, which is what
 * the farmer meant - the "best price" part is just how they phrased it.
 */
function detectIntent(transcript, language) {
  const text = (transcript || "").toLowerCase();

  // Check this language's keywords AND English, because people mix
  // English words into Hindi and Marathi sentences constantly
  // ("टमाटर का rate काय आहे").
  const languagesToCheck = language === "en" ? ["en"] : [language, "en"];

  function matches(intentName) {
    return languagesToCheck.some((lang) =>
      containsAny(text, INTENT_KEYWORDS[intentName][lang] || [])
    );
  }

  if (matches("goodbye")) return "goodbye";
  if (matches("nearest")) return "nearest";
  if (matches("highest")) return "highest";
  if (matches("arrival")) return "arrival";
  if (matches("price")) return "price";
  // A bare greeting, but only if nothing more specific matched - "hello,
  // what's the price of onion" is a price question, not a greeting.
  if (matches("greeting")) return "greeting";

  return "unknown";
}

// =======================================================================
// ENTITIES
// =======================================================================

/**
 * Finds the crop being asked about.
 *
 * Plain substring matching against the lookup table. It handles
 * inflected forms for free: Marathi "कांद्याचा" (of onion) contains
 * "कांद" ... well, not quite - which is why the table lists the common
 * forms. Where a form is missing the caller falls back to conversation
 * context, so a follow-up still works.
 */
function extractCrop(transcript) {
  const text = (transcript || "").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  // ---- Pass 1: the name appears exactly as the dictionary spells it ----
  for (const [spokenName, englishName] of CROP_LOOKUP) {
    // Very short names ("til", "ale") turn up inside unrelated words, so
    // they must match a whole word. Longer ones are safe as substrings.
    if (spokenName.length <= 4) {
      const pattern = new RegExp(`(^|\\s)${escapeRegex(spokenName)}(\\s|$)`, "i");
      if (pattern.test(text)) return englishName;
    } else if (text.includes(spokenName)) {
      return englishName;
    }
  }

  // ---- Pass 2: the name appears INFLECTED ----
  // Hindi and Marathi decline nouns, so the word a farmer actually says
  // is usually not the dictionary form:
  //
  //     कांदा  (onion)  ->  कांद्याचा  ("of onion")
  //     टोमॅटो (tomato) ->  टोमॅटोचा
  //
  // "कांद्याचा" does not contain "कांदा" as a substring - the vowel sign
  // changes - so pass 1 misses it, and a farmer asking the most natural
  // form of the question ("कांद्याचा भाव किती?") gets nothing back.
  //
  // Comparing STEMS fixes it: strip the trailing vowel marks from the
  // dictionary name and check whether any spoken word begins with what
  // is left. "कांद्याचा" does begin with "कांद".
  for (const [spokenName, englishName] of CROP_LOOKUP) {
    if (!isDevanagari(spokenName)) continue;

    const stem = devanagariStem(spokenName);
    if (stem.length < 3) continue; // too short to be distinctive

    if (words.some((word) => word.startsWith(stem))) {
      return englishName;
    }
  }

  return null;
}

/** Is this text written in Devanagari? */
function isDevanagari(text) {
  return /[ऀ-ॿ]/.test(text);
}

/**
 * Strips the trailing vowel signs and nasal marks that Hindi and Marathi
 * add when a noun is declined, leaving the part that stays constant.
 *
 *     कांदा -> कांद       टोमॅटो -> टोमॅट       गेहूं -> गेहू
 *
 * U+093E-U+094D are the dependent vowel signs and virama; U+0902-U+0903
 * are the anusvara and visarga.
 */
function devanagariStem(word) {
  return word.replace(/[ा-्ंः]+$/, "");
}

/** Finds a state name, if one was mentioned. */
function extractState(transcript) {
  const text = (transcript || "").toLowerCase();
  for (const [spokenName, englishName] of STATE_LOOKUP) {
    if (spokenName.length <= 3) continue; // "up", "ap" are too ambiguous in speech
    if (text.includes(spokenName)) return englishName;
  }
  return null;
}

/**
 * Finds a place name that ISN'T a state - a mandi or district.
 *
 * We can't have a list of every mandi name people might say, so instead
 * we take the words AFTER a connector ("in", "मध्ये", "में"). In
 * "price of onion in Lasalgaon", everything after " in " is the place.
 *
 * This is a guess, and it's treated as one: the controller looks the
 * result up and, if nothing matches, says so rather than inventing data.
 */
function extractPlace(transcript, language) {
  const text = (transcript || "").trim();
  const connectors = [
    ...(PLACE_CONNECTORS[language] || []),
    ...PLACE_CONNECTORS.en,
  ];

  for (const connector of connectors) {
    const index = text.toLowerCase().lastIndexOf(connector);
    if (index === -1) continue;

    let candidate = text.slice(index + connector.length).trim();

    // Trim trailing question words that aren't part of the name.
    candidate = candidate
      .replace(/[?.!,]/g, " ")
      .replace(
        /\b(mandi|market|apmc|district|state|भाव|दर|किंमत|काय|आहे|क्या|है|कितना|कितनी|मंडी|मंडई|जिला|जिल्हा)\b/gi,
        " "
      )
      .trim();

    // One to three words is a plausible place name; more is a sentence.
    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 3) {
      return words.join(" ");
    }
  }

  return null;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =======================================================================
// THE ONE FUNCTION THE CONTROLLER CALLS
// =======================================================================

/**
 * @param {string} transcript - what speech recognition heard
 * @param {string} browserLanguageHint - the lang it was listening in
 * @param {object} context - { crop, mandi } from earlier in the chat
 * @returns {{ language, intent, crop, state, place, usedContext }}
 */
function parseVoiceQuery(transcript, browserLanguageHint, context = {}) {
  const language = detectLanguage(transcript, browserLanguageHint);
  const intent = detectIntent(transcript, language);

  const spokenCrop = extractCrop(transcript);
  const state = extractState(transcript);
  const place = extractPlace(transcript, language);

  // ---- CONVERSATION CONTEXT ----
  // This is what makes follow-ups work. "and what about tomato?" has no
  // intent word in it at all; "what about in Nashik?" has no crop. So we
  // fill each gap from the last turn:
  //   - no crop mentioned -> reuse the crop we were just discussing
  //   - no intent recognised, but a crop WAS named -> they're asking the
  //     same question about a different crop
  let resolvedIntent = intent;
  let resolvedCrop = spokenCrop;
  let usedContext = false;

  if (!resolvedCrop && context.crop) {
    resolvedCrop = context.crop;
    usedContext = true;
  }

  if (resolvedIntent === "unknown" && spokenCrop && context.intent) {
    resolvedIntent = context.intent;
    usedContext = true;
  }

  return {
    language,
    intent: resolvedIntent,
    crop: resolvedCrop,
    spokenCrop, // what they actually said this turn, before context filled it in
    state,
    place,
    usedContext,
  };
}

module.exports = {
  parseVoiceQuery,
  detectLanguage,
  detectIntent,
  extractCrop,
  extractState,
  extractPlace,
};
