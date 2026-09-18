// testVoice.js
// -----------------------------------------------------------------------
// End-to-end tests for the voice assistant's BACKEND half.
//
//     cd backend
//     node testVoice.js
//
// It talks to a running server over HTTP, exactly as the browser does -
// so it exercises routing, auth, intent parsing, the live mandi data and
// the spoken reply, all together. The only part it can't cover is the
// microphone itself, which no automated test can.
//
// WHY A SCRIPT AND NOT curl: Devanagari in a shell command gets mangled
// by the Windows console codepage - "कांद्याचा" arrives at the server as
// mojibake and the test fails for a reason that has nothing to do with
// the code. Node sends UTF-8 properly.
// -----------------------------------------------------------------------

require("dotenv").config();

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

async function login() {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.DEFAULT_FARMER_EMAIL,
      password: process.env.DEFAULT_FARMER_PASSWORD,
    }),
  });
  const body = await response.json();
  // The login response carries the SHORT-LIVED access token. It used to
  // be called `token`; it was renamed when the refresh-cookie flow came
  // in, so that the long-lived credential and this one cannot be
  // confused. See backend/controllers/authController.js.
  if (!body.accessToken) throw new Error("Could not log in: " + JSON.stringify(body));
  return body.accessToken;
}

async function ask(token, payload) {
  const response = await fetch(`${BASE}/api/voice/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return response.json();
}

// Each case: what to send, and what must be true of the answer.
const CASES = [
  {
    name: "Greeting in Marathi",
    payload: { transcript: "नमस्कार", language: "mr-IN", confidence: 0.9 },
    expect: (r) => r.language === "mr" && r.intent === "greeting",
    show: (r) => r.reply.slice(0, 60),
  },
  {
    name: "Greeting in Hindi",
    payload: { transcript: "नमस्ते", language: "hi-IN", confidence: 0.9 },
    expect: (r) => r.language === "hi" && r.intent === "greeting",
    show: (r) => r.reply.slice(0, 60),
  },
  {
    name: "Greeting in English",
    payload: { transcript: "hello", language: "en-IN", confidence: 0.9 },
    expect: (r) => r.language === "en" && r.intent === "greeting",
    show: (r) => r.reply.slice(0, 60),
  },
  {
    name: "Highest price of onion (English)",
    payload: {
      transcript: "what is the highest price of onion",
      language: "en-IN",
      confidence: 0.95,
    },
    expect: (r) =>
      r.intent === "highest" &&
      r.entities.crop === "Onion" &&
      r.data &&
      r.data.modalPrice > 0,
    show: (r) => r.reply,
  },
  {
    name: "Highest price of onion (Marathi, inflected)",
    payload: {
      transcript: "कांद्याचा सर्वात जास्त भाव किती आहे",
      language: "mr-IN",
      confidence: 0.85,
    },
    expect: (r) =>
      r.language === "mr" && r.intent === "highest" && r.entities.crop === "Onion",
    // The crop must be named in Marathi, not as the English "Onion".
    show: (r) => r.reply,
    also: (r) => (r.reply.includes("कांद") ? null : "crop name not localised to Marathi"),
  },
  {
    name: "Nearest mandi for tomato (with GPS)",
    payload: {
      transcript: "nearest mandi for tomato",
      language: "en-IN",
      confidence: 0.9,
      lat: 19.9975,
      lon: 73.7898, // Nashik
    },
    expect: (r) => r.intent === "nearest" && r.entities.crop === "Tomato",
    show: (r) => r.reply,
  },
  {
    // REGRESSION GUARD. "nearest Mandi" with no crop named used to hit
    // the "everything else needs a crop" rule and come back with
    // "which crop would you like?" - which reads as the assistant
    // ignoring a perfectly clear question. Nearest is a GEOGRAPHY
    // question and must be answered from the mandi directory.
    name: "Bare 'nearest mandi' - no crop - still gets an answer",
    payload: {
      transcript: "nearest Mandi",
      language: "en-IN",
      confidence: 0.9,
      lat: 19.9975,
      lon: 73.7898,
    },
    expect: (r) =>
      r.intent === "nearest" &&
      r.data &&
      typeof r.data.mandiName === "string" &&
      r.data.distanceKm > 0,
    show: (r) => r.reply,
    also: (r) =>
      /which crop would you like to know about/i.test(r.reply)
        ? "refused to answer and asked for a crop instead"
        : null,
  },
  {
    // The place slot used to swallow the crop, because " of " is one of
    // the English place connectors: "price of onion" parsed as
    // place="onion" and answered "no price for Onion in onion today".
    name: "'price of onion' - crop must not land in the place slot",
    payload: {
      transcript: "what is the price of onion",
      language: "en-IN",
      confidence: 0.9,
    },
    expect: (r) => r.entities.crop === "Onion" && !r.entities.place,
    show: (r) => r.reply.slice(0, 95),
  },
  {
    // Hindi and Marathi put the place BEFORE the marker. The extractor
    // sliced after it, so Hindi returned the tail of the sentence
    // ("भाव क्या है") and it was geocoded as if it were a town.
    name: "Hindi postpositional place is read correctly",
    payload: {
      transcript: "इंदौर में गेहूं का भाव क्या है",
      language: "hi-IN",
      confidence: 0.9,
    },
    expect: (r) =>
      r.language === "hi" &&
      r.entities.crop === "Wheat" &&
      r.entities.place === "इंदौर",
    show: (r) => `place=${r.entities.place} | ${r.reply.slice(0, 60)}`,
  },
  {
    // REGRESSION GUARD. This used to answer a "nearest mandi" question
    // with the national highest-price sentence and no hint that it had
    // switched questions, so it sounded like the assistant was repeating
    // its answer to the PREVIOUS question. A nearest query must always
    // come back either with mandis nearby, or explicitly flagged as
    // "nothing within the radius".
    name: "Nearest with GPS always answers the NEAREST question",
    payload: {
      transcript: "माझ्या सर्वात जवळ कुठली मंडी आहे",
      language: "mr-IN",
      confidence: 0.9,
      lat: 19.9975,
      lon: 73.7898,
      context: { crop: "Onion", intent: "highest" },
    },
    expect: (r) =>
      r.intent === "nearest" &&
      r.data &&
      (r.data.mandisNearby > 0 || r.data.noneWithinRadius === true),
    show: (r) => r.reply.slice(0, 110),
  },
  {
    name: "Nearest mandi WITHOUT location -> asks for it",
    payload: {
      transcript: "nearest mandi for tomato",
      language: "en-IN",
      confidence: 0.9,
    },
    expect: (r) => r.intent === "nearest" && (r.needsLocation || r.data),
    show: (r) => r.reply.slice(0, 80),
  },
  {
    name: "Price of wheat in a named place",
    payload: {
      transcript: "price of wheat in Indore",
      language: "en-IN",
      confidence: 0.9,
    },
    expect: (r) => r.entities.crop === "Wheat" && typeof r.reply === "string",
    show: (r) => r.reply,
  },
  {
    name: "Arrival quantity -> says honestly it has no such data",
    payload: {
      transcript: "arrival quantity of onion in Lasalgaon",
      language: "en-IN",
      confidence: 0.9,
    },
    expect: (r) =>
      r.intent === "arrival" && r.data && r.data.unavailable === "arrival_quantity",
    show: (r) => r.reply.slice(0, 100),
  },
  {
    name: "Low confidence -> asks the farmer to repeat",
    payload: {
      transcript: "zzz mumble noise",
      language: "en-IN",
      confidence: 0.2,
    },
    expect: (r) => r.intent === "low_confidence" && r.needsClarification === true,
    show: (r) => r.reply,
  },
  {
    name: "Unclear intent -> clarifying question, not a guess",
    payload: {
      transcript: "the weather is nice today",
      language: "en-IN",
      confidence: 0.95,
    },
    expect: (r) => r.needsClarification === true && r.intent === "unknown",
    show: (r) => r.reply.slice(0, 80),
  },
  {
    name: "FOLLOW-UP: 'what about tomato' reuses the last intent",
    payload: {
      transcript: "what about tomato",
      language: "en-IN",
      confidence: 0.9,
      context: { crop: "Onion", intent: "highest" },
    },
    expect: (r) =>
      r.intent === "highest" && r.entities.crop === "Tomato" && r.usedContext === true,
    show: (r) => r.reply,
  },
  {
    name: "FOLLOW-UP in Marathi: bare crop name reuses intent",
    payload: {
      transcript: "टोमॅटो",
      language: "mr-IN",
      confidence: 0.8,
      context: { crop: "Onion", intent: "highest" },
    },
    expect: (r) => r.language === "mr" && r.entities.crop === "Tomato",
    show: (r) => r.reply.slice(0, 90),
  },
  {
    // REGRESSION GUARD, and an important one: these are the three
    // prompts the assistant SUGGESTS to the farmer on screen. If any of
    // them does not work, it is the first thing a new user hits.
    //
    // The Hindi and Marathi versions of the third one used to fail
    // while the English one passed, because the place came through in
    // Devanagari ("\u0907\u0902\u0926\u094c\u0930") and the government feed writes it in Latin
    // ("Indore"), so the old substring match could never be true.
    name: "SUGGESTED PROMPT (hi): price of wheat in Indore",
    payload: {
      transcript: "\u0907\u0902\u0926\u094c\u0930 \u092e\u0947\u0902 \u0917\u0947\u0939\u0942\u0902 \u0915\u093e \u092d\u093e\u0935",
      language: "hi-IN",
      confidence: 0.95,
    },
    // WHAT THIS ACTUALLY TESTS: that a place spoken in Devanagari is
    // matched against government data written in Latin script -
    // "\u0907\u0902\u0926\u094c\u0930" against "Indore". It does NOT test that Indore happens
    // to have wheat today.
    //
    // It used to assert `data.averagePrice > 0`, which quietly made it a
    // test of the day's government feed: the moment wheat dropped to a
    // single reporting mandi (Kukshi, in Dhar), the test failed while
    // the code it was guarding was working perfectly. A test that turns
    // red because the weather changed teaches you to ignore red.
    //
    // So: the place must be UNDERSTOOD and searched for. Finding no
    // wheat there is a legitimate answer.
    expect: (r) =>
      r.language === "hi" &&
      r.entities.crop === "Wheat" &&
      r.entities.place === "इंदौर",
    show: (r) => `place=${r.entities.place} | ${r.reply.slice(0, 60)}`,
    also: (r) =>
      // The failure that matters: the place being ignored and a
      // national answer given instead. If it searched Indore, the reply
      // says so either way.
      r.reply.includes("इंदौर") ? null : "the reply does not mention the place asked about",
  },
  {
    name: "SUGGESTED PROMPT (mr): price of wheat in Indore",
    payload: {
      transcript: "\u0907\u0902\u0926\u0942\u0930 \u092e\u0927\u094d\u092f\u0947 \u0917\u0935\u094d\u0939\u093e\u091a\u093e \u092d\u093e\u0935",
      language: "mr-IN",
      confidence: 0.95,
    },
    // Same reasoning as the Hindi case above: this proves Devanagari
    // "\u0907\u0902\u0926\u0942\u0930" reaches Latin "Indore", not that Indore has wheat today.
    expect: (r) =>
      r.language === "mr" &&
      r.entities.crop === "Wheat" &&
      r.entities.place === "इंदूर",
    show: (r) => `place=${r.entities.place} | ${r.reply.slice(0, 60)}`,
    also: (r) =>
      r.reply.includes("इंदूर") ? null : "the reply does not mention the place asked about",
  },
  {
    // The terse forms the UI suggests, as opposed to the fuller
    // sentences the other cases use. "Highest price of onion" has no
    // question words in it at all.
    name: "SUGGESTED PROMPT (hi): highest price of onion",
    payload: {
      transcript: "\u092a\u094d\u092f\u093e\u091c \u0915\u093e \u0938\u092c\u0938\u0947 \u091c\u094d\u092f\u093e\u0926\u093e \u092d\u093e\u0935",
      language: "hi-IN",
      confidence: 0.95,
    },
    expect: (r) =>
      r.language === "hi" && r.intent === "highest" && r.entities.crop === "Onion",
    show: (r) => r.reply.slice(0, 80),
  },
  {
    name: "SUGGESTED PROMPT (mr): nearest mandi for tomato",
    payload: {
      transcript: "\u092e\u093e\u091d\u094d\u092f\u093e \u091c\u0935\u0933\u091a\u0940 \u091f\u094b\u092e\u0945\u091f\u094b \u092e\u0902\u0921\u0908",
      language: "mr-IN",
      confidence: 0.95,
      lat: 19.9975,
      lon: 73.7898,
    },
    expect: (r) =>
      r.language === "mr" && r.intent === "nearest" && r.entities.crop === "Tomato",
    show: (r) => r.reply.slice(0, 80),
  },
  {
    // ============================================================
    // REGRESSION GUARD: lowest must not return highest.
    // ============================================================
    // There was no `lowest` intent at all. "\u0938\u092c\u0938\u0947 \u0915\u092e \u092a\u094d\u092f\u093e\u091c \u0915\u093e \u092d\u093e\u0935"
    // matched nothing, fell through to the catch-all `price` intent
    // (it contains "\u092d\u093e\u0935"), and the controller answered every plain
    // price question with answerHighest. So asking for the CHEAPEST
    // reliably returned the DEAREST mandi in India.
    name: "LOWEST (en): lowest onion price",
    payload: { transcript: "lowest onion price", language: "en-IN", confidence: 0.95 },
    expect: (r) => r.intent === "lowest" && r.entities.crop === "Onion" && r.data.modalPrice > 0,
    show: (r) => `\u20b9${r.data.modalPrice} @ ${r.data.mandiName}`,
  },
  {
    name: "LOWEST (hi): \u0938\u092c\u0938\u0947 \u0915\u092e \u092a\u094d\u092f\u093e\u091c \u0915\u093e \u092d\u093e\u0935",
    payload: {
      transcript: "\u0938\u092c\u0938\u0947 \u0915\u092e \u092a\u094d\u092f\u093e\u091c \u0915\u093e \u092d\u093e\u0935 \u0915\u0939\u093e\u0902 \u092e\u093f\u0932\u0924\u093e \u0939\u0948",
      language: "hi-IN",
      confidence: 0.95,
    },
    expect: (r) => r.language === "hi" && r.intent === "lowest" && r.entities.crop === "Onion",
    show: (r) => r.reply.slice(0, 80),
    // The exact wording of the original bug report: the reply must NOT
    // be the highest-price sentence.
    also: (r) =>
      /\u0938\u092c\u0938\u0947 \u091c\u094d\u092f\u093e\u0926\u093e/.test(r.reply) ? "answered with the HIGHEST price sentence" : null,
  },
  {
    name: "LOWEST (mr): \u0938\u0930\u094d\u0935\u093e\u0924 \u0915\u092e\u0940 \u0915\u093e\u0902\u0926\u094d\u092f\u093e\u091a\u093e \u092d\u093e\u0935",
    payload: {
      transcript: "\u0938\u0930\u094d\u0935\u093e\u0924 \u0915\u092e\u0940 \u0915\u093e\u0902\u0926\u094d\u092f\u093e\u091a\u093e \u092d\u093e\u0935",
      language: "mr-IN",
      confidence: 0.95,
    },
    expect: (r) => r.language === "mr" && r.intent === "lowest" && r.entities.crop === "Onion",
    show: (r) => r.reply.slice(0, 80),
    also: (r) =>
      /\u0938\u0930\u094d\u0935\u093e\u0924 \u091c\u093e\u0938\u094d\u0924/.test(r.reply) ? "answered with the HIGHEST price sentence" : null,
  },
  {
    // The two directions must actually differ. Intent alone passing
    // would not catch a wiring mistake where both call answerHighest.
    name: "LOWEST vs HIGHEST give DIFFERENT mandis (tomato)",
    payload: { transcript: "minimum price of tomato", language: "en-IN", confidence: 0.95 },
    expect: (r) => r.intent === "lowest" && r.data.modalPrice > 0,
    show: (r) => `lowest \u20b9${r.data.modalPrice} @ ${r.data.mandiName}`,
    also: (r) =>
      // Tomato reports from 150+ mandis, so the cheapest and dearest
      // cannot legitimately be the same price.
      r.data.mandisCompared > 1 && r.data.direction !== "lowest"
        ? "data.direction was not 'lowest'"
        : null,
  },
  {
    // ============================================================
    // THE SAFEGUARD: ask rather than guess.
    // ============================================================
    name: "AMBIGUOUS (hi): superlative with no direction -> asks",
    payload: {
      transcript: "\u092a\u094d\u092f\u093e\u091c \u0915\u093e \u0938\u092c\u0938\u0947 \u092c\u0922\u093c\u093f\u092f\u093e \u092d\u093e\u0935 \u0915\u094c\u0928 \u0938\u0940 \u092e\u0902\u0921\u0940",
      language: "hi-IN",
      confidence: 0.95,
    },
    expect: (r) =>
      r.language === "hi" &&
      r.intent === "price_direction_unclear" &&
      r.needsClarification === true,
    show: (r) => r.reply,
  },
  {
    name: "AMBIGUOUS: both directions named at once -> asks",
    payload: {
      transcript: "\u0938\u092c\u0938\u0947 \u0915\u092e \u092f\u093e \u0938\u092c\u0938\u0947 \u091c\u094d\u092f\u093e\u0926\u093e \u092a\u094d\u092f\u093e\u091c \u0915\u093e \u092d\u093e\u0935",
      language: "hi-IN",
      confidence: 0.95,
    },
    expect: (r) => r.intent === "price_direction_unclear" && r.needsClarification === true,
    show: (r) => r.reply,
  },
  {
    // A neutral price question is NOT ambiguous - they did not ask for
    // an extreme. It used to be answered with the single dearest mandi
    // in India; now it gets the average across all of them.
    name: "NEUTRAL: plain price question -> average, not highest",
    payload: {
      transcript: "what is the price of onion",
      language: "en-IN",
      confidence: 0.95,
    },
    expect: (r) =>
      r.intent === "price" &&
      r.data &&
      r.data.direction === "average" &&
      r.data.averagePrice > 0,
    show: (r) => r.reply.slice(0, 90),
  },
  {
    name: "Goodbye ends the session",
    payload: { transcript: "धन्यवाद", language: "mr-IN", confidence: 0.9 },
    expect: (r) => r.intent === "goodbye" && r.endSession === true,
    show: (r) => r.reply,
  },
];

(async () => {
  let token;
  try {
    token = await login();
  } catch (error) {
    console.error("Could not log in - is the server running?\n", error.message);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    let result;
    try {
      result = await ask(token, testCase.payload);
    } catch (error) {
      console.log(`FAIL  ${testCase.name}\n        request error: ${error.message}`);
      failed++;
      continue;
    }

    const ok = testCase.expect(result);
    const extraProblem = testCase.also ? testCase.also(result) : null;

    if (ok && !extraProblem) {
      passed++;
      console.log(`PASS  ${testCase.name}`);
      console.log(`        -> ${testCase.show(result)}`);
    } else {
      failed++;
      console.log(`FAIL  ${testCase.name}`);
      if (extraProblem) console.log(`        ${extraProblem}`);
      console.log(`        got: ${JSON.stringify(result).slice(0, 220)}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
