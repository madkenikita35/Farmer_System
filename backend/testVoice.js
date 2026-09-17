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
