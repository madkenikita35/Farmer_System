// config/voicePhrases.js
// -----------------------------------------------------------------------
// The vocabulary the VOICE assistant listens for, and the sentences it
// speaks back, in English, Hindi and Marathi.
//
// ---------------------------------------------------------------------
// WHY THIS IS SEPARATE FROM config/ocrDictionaries.js
// ---------------------------------------------------------------------
// That file already lists crops with their Hindi/Marathi names - but in
// ROMAN letters ("kanda", "dhaniya"), because that's what OCR reads off
// a printed receipt.
//
// Speech recognition returns something quite different. Ask Chrome to
// listen in mr-IN and it hands back DEVANAGARI: "कांदा", not "kanda".
// Worse, services/fuzzyMatch.js strips every character outside a-z0-9
// before comparing, so a Devanagari transcript arrives at the matcher as
// an empty string.
//
// So the voice module needs its own vocabulary in the actual script
// people speak in. That's what this file is. The two dictionaries are
// merged at runtime (see services/voiceIntentService.js), so a farmer can
// say "कांदा", "kanda" or "onion" and all three resolve to Onion.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// 1. CROP NAMES IN DEVANAGARI
// ---------------------------------------------------------------------
// Keyed by the English name used by the government dataset, so whatever
// a farmer says, we look the price up under the name the API expects.
// Hindi and Marathi words are listed together - a farmer may well use
// either, and there's no cost to accepting both.
const CROP_NAMES_DEVANAGARI = {
  Wheat: ["गेहूं", "गेहू", "गहू", "गव्हाचे", "गहु"],
  Rice: ["चावल", "तांदूळ", "तांदुळ"],
  Paddy: ["धान", "भात"],
  Onion: ["प्याज", "प्याज़", "कांदा", "कांदे"],
  Potato: ["आलू", "बटाटा", "बटाटे"],
  Tomato: ["टमाटर", "टोमॅटो", "टोमाटो"],
  Cotton: ["कपास", "कापूस"],
  Soyabean: ["सोयाबीन"],
  Maize: ["मक्का", "मका", "मकई"],
  Gram: ["चना", "हरभरा", "चणा"],
  Tur: ["तूर", "अरहर", "तुर"],
  Moong: ["मूंग", "मुग"],
  Urad: ["उड़द", "उडीद"],
  Lentil: ["मसूर", "मसुर"],
  Peas: ["मटर", "वाटाणा"],
  Coriander: ["धनिया", "धने", "कोथिंबीर", "धणे"],
  Cumin: ["जीरा", "जिरे"],
  Turmeric: ["हल्दी", "हळद"],
  Chilli: ["मिर्च", "मिर्ची", "मिरची", "लाल मिर्च"],
  Garlic: ["लहसुन", "लसूण"],
  Ginger: ["अदरक", "आले"],
  Mustard: ["सरसों", "मोहरी"],
  Groundnut: ["मूंगफली", "भुईमूग", "शेंगदाणे"],
  Bajra: ["बाजरा", "बाजरी"],
  Jowar: ["ज्वार", "ज्वारी"],
  Sugarcane: ["गन्ना", "ऊस"],
  Banana: ["केला", "केळी"],
  Mango: ["आम", "आंबा"],
  Grapes: ["अंगूर", "द्राक्ष", "द्राक्षे"],
  Pomegranate: ["अनार", "डाळिंब"],
  Orange: ["संतरा", "संत्रा"],
  Apple: ["सेब", "सफरचंद"],
  Lemon: ["नींबू", "लिंबू"],
  Coconut: ["नारियल", "नारळ"],
  Brinjal: ["बैंगन", "वांगी", "वांगे"],
  Cabbage: ["पत्ता गोभी", "कोबी"],
  Cauliflower: ["फूल गोभी", "फ्लॉवर", "फुलकोबी"],
  Carrot: ["गाजर"],
  Bhindi: ["भिंडी", "भेंडी"],
  Spinach: ["पालक"],
  Cucumber: ["खीरा", "काकडी"],
};


// ---------------------------------------------------------------------
// 1b. HOW TO SAY A CROP NAME BACK
// ---------------------------------------------------------------------
// The dataset stores crops in English ("Onion"), so without this the
// assistant replies "Onion चा सर्वात जास्त भाव..." - an English word
// dropped into the middle of a Marathi sentence. Text-to-speech then
// switches accent mid-sentence to read it, which sounds wrong and is
// harder to follow than either language on its own.
//
// Hindi and Marathi are listed separately here (unlike the recognition
// list above, where mixing them is harmless), because a Marathi speaker
// says कांदा and a Hindi speaker says प्याज.
//
// Anything not listed falls back to the English name - better a slightly
// awkward sentence than no answer.
const CROP_DISPLAY_NAMES = {
  Onion: { hi: "प्याज", mr: "कांदा" },
  Potato: { hi: "आलू", mr: "बटाटा" },
  Tomato: { hi: "टमाटर", mr: "टोमॅटो" },
  Wheat: { hi: "गेहूं", mr: "गहू" },
  Rice: { hi: "चावल", mr: "तांदूळ" },
  Paddy: { hi: "धान", mr: "भात" },
  Maize: { hi: "मक्का", mr: "मका" },
  Cotton: { hi: "कपास", mr: "कापूस" },
  Soyabean: { hi: "सोयाबीन", mr: "सोयाबीन" },
  Gram: { hi: "चना", mr: "हरभरा" },
  Tur: { hi: "अरहर", mr: "तूर" },
  Moong: { hi: "मूंग", mr: "मूग" },
  Urad: { hi: "उड़द", mr: "उडीद" },
  Lentil: { hi: "मसूर", mr: "मसूर" },
  Peas: { hi: "मटर", mr: "वाटाणा" },
  Coriander: { hi: "धनिया", mr: "कोथिंबीर" },
  Cumin: { hi: "जीरा", mr: "जिरे" },
  Turmeric: { hi: "हल्दी", mr: "हळद" },
  Chilli: { hi: "मिर्च", mr: "मिरची" },
  Garlic: { hi: "लहसुन", mr: "लसूण" },
  Ginger: { hi: "अदरक", mr: "आले" },
  Mustard: { hi: "सरसों", mr: "मोहरी" },
  Groundnut: { hi: "मूंगफली", mr: "भुईमूग" },
  Bajra: { hi: "बाजरा", mr: "बाजरी" },
  Jowar: { hi: "ज्वार", mr: "ज्वारी" },
  Sugarcane: { hi: "गन्ना", mr: "ऊस" },
  Banana: { hi: "केला", mr: "केळी" },
  Mango: { hi: "आम", mr: "आंबा" },
  Grapes: { hi: "अंगूर", mr: "द्राक्षे" },
  Pomegranate: { hi: "अनार", mr: "डाळिंब" },
  Orange: { hi: "संतरा", mr: "संत्रा" },
  Apple: { hi: "सेब", mr: "सफरचंद" },
  Lemon: { hi: "नींबू", mr: "लिंबू" },
  Coconut: { hi: "नारियल", mr: "नारळ" },
  Brinjal: { hi: "बैंगन", mr: "वांगी" },
  Cabbage: { hi: "पत्ता गोभी", mr: "कोबी" },
  Cauliflower: { hi: "फूल गोभी", mr: "फुलकोबी" },
  Carrot: { hi: "गाजर", mr: "गाजर" },
  Bhindi: { hi: "भिंडी", mr: "भेंडी" },
  Spinach: { hi: "पालक", mr: "पालक" },
  Cucumber: { hi: "खीरा", mr: "काकडी" },
};

/**
 * The name to SAY for a crop, in the language being spoken.
 */
function cropDisplayName(englishName, language) {
  if (!englishName) return englishName;
  if (language === "en") return englishName;
  const entry = CROP_DISPLAY_NAMES[englishName];
  return (entry && entry[language]) || englishName;
}

// ---------------------------------------------------------------------
// 2. INTENT KEYWORDS
// ---------------------------------------------------------------------
// Each intent lists the words that signal it, per language. Matching is
// a plain substring test on the lowercased transcript - deliberately
// simple, because speech transcripts are short and a heavier NLP layer
// would be far more to go wrong for very little gain here.
//
// ORDER MATTERS in services/voiceIntentService.js: "nearest mandi with
// the best price" contains both NEAREST and HIGHEST words, so NEAREST is
// tested first. Otherwise "nearest" queries would answer as "highest".
const INTENT_KEYWORDS = {
  // "Which mandi near me pays best for X?"
  nearest: {
    en: ["nearest", "near me", "nearby", "closest", "close to me", "around me"],
    hi: ["नजदीक", "नज़दीक", "पास", "करीब", "नजदीकी", "नज़दीकी", "आसपास"],
    mr: ["जवळ", "जवळची", "जवळचा", "जवळपास", "नजीक"],
  },

  // "Where is X selling highest?"
  highest: {
    en: ["highest", "best price", "maximum", "most expensive", "top price", "best rate"],
    hi: ["सबसे ज्यादा", "सबसे अधिक", "सर्वाधिक", "सबसे ऊंचा", "सबसे महंगा", "अच्छा भाव"],
    mr: ["सर्वात जास्त", "सगळ्यात जास्त", "सर्वाधिक", "जास्त भाव", "चांगला भाव"],
  },

  // "How much arrived at X?" - recognised, but see ARRIVAL_UNAVAILABLE.
  arrival: {
    en: ["arrival", "arrivals", "quantity arrived", "how much arrived", "tonnes arrived"],
    hi: ["आवक", "कितना आया", "मात्रा"],
    mr: ["आवक", "किती आले", "प्रमाण"],
  },

  // "What is X selling for (in Y)?" - the catch-all price question.
  price: {
    en: ["price", "rate", "cost", "how much", "selling for", "value"],
    hi: ["भाव", "दाम", "रेट", "कीमत", "कितने का", "कितना है"],
    mr: ["भाव", "दर", "किंमत", "किती", "कितीला"],
  },

  // Politeness / session control, so "thank you" doesn't get parsed as a
  // crop query and produce a confusing answer.
  greeting: {
    en: ["hello", "hi there", "namaste", "good morning", "good evening"],
    hi: ["नमस्ते", "नमस्कार", "हैलो", "हेलो"],
    mr: ["नमस्कार", "नमस्ते", "हॅलो"],
  },
  goodbye: {
    en: ["bye", "goodbye", "stop", "thank you", "thanks", "that's all"],
    hi: ["धन्यवाद", "शुक्रिया", "बस", "बंद करो", "अलविदा"],
    mr: ["धन्यवाद", "बस", "थांबा", "बंद करा"],
  },
};

// Words that mean "in / at <place>", used to split a transcript into the
// crop part and the place part. Longest first, so "in the" beats "in".
const PLACE_CONNECTORS = {
  en: [" in the ", " at the ", " in ", " at ", " of "],
  hi: [" में ", " मे ", " की ", " का ", " के "],
  mr: [" मध्ये ", " मधील ", " च्या ", " ची ", " चा "],
};

// ---------------------------------------------------------------------
// 3. SPOKEN REPLIES
// ---------------------------------------------------------------------
// Functions rather than plain strings, because the numbers have to sit
// inside the sentence and each language puts them in a different place.
// Keeping them here means the controller does data work only, and every
// sentence a farmer hears lives in one file you can read end to end.
const REPLIES = {
  en: {
    greeting:
      "Hello! I am your farming assistant. You can ask me about mandi prices, the nearest mandi, or crop information.",
    highestPrice: (crop, mandi, state, price, date) =>
      `The highest price for ${crop} is ${price} rupees per quintal at ${mandi} in ${state}${date ? `, as of ${date}` : ""}.`,
    nearestBest: (crop, mandi, price, km) =>
      `The best nearby price for ${crop} is ${price} rupees per quintal at ${mandi}, about ${km} kilometres away.`,
    // Used when NO mandi within the radius reported this crop today.
    // It must say so out loud: quietly answering the "highest price
    // anywhere" question instead sounds like the assistant replied to
    // the farmer's PREVIOUS question.
    noneNearby: (crop, radius, mandi, state, price, km) =>
      `No mandi within ${radius} kilometres reported ${crop} prices today. The nearest one that did is ${mandi} in ${state}, about ${km} kilometres away, at ${price} rupees per quintal.`,
    // Answer to a bare "which mandi is nearest?" - no crop named. This
    // is a GEOGRAPHY question and needs no crop to answer, so answer it
    // first and ask for the crop afterwards, rather than refusing.
    nearestMandiList: (mandi, district, km, count, radius) =>
      `Your nearest mandi is ${mandi} in ${district}, about ${km} kilometres away.${count ? ` There are ${count} mandis within ${radius} kilometres.` : ""} Which crop would you like the price for?`,
    priceAt: (crop, place, price) =>
      `${crop} is selling at about ${price} rupees per quintal in ${place}.`,
    priceAverage: (crop, price, count) =>
      `${crop} is averaging ${price} rupees per quintal across ${count} mandis today.`,
    noData: (crop) =>
      `Sorry, I could not find today's price for ${crop}. Not every mandi reports every crop each day. Please try another crop.`,
    noPlaceData: (crop, place) =>
      `I could not find a price for ${crop} in ${place} today. Would you like the highest price anywhere instead?`,
    arrivalUnavailable: (crop) =>
      `I am sorry, arrival quantity is not available. The government price service we use publishes prices only, not arrival volumes. I can tell you the price of ${crop || "a crop"} instead.`,
    needLocation:
      "To find the nearest mandi I need your location. Please allow location access, or tell me your district.",
    clarify:
      "Sorry, I did not catch that. You can ask something like: what is the price of onion, or, which mandi near me pays best for tomato?",
    lowConfidence: "I did not hear that clearly. Could you please say it again?",
    noCrop:
      "Which crop would you like to know about? For example, onion, wheat or tomato.",
    goodbye: "Goodbye, and good luck with your sale.",
  },

  hi: {
    greeting:
      "नमस्ते! मैं आपका कृषि सहायक हूँ। आप मुझसे मंडी के भाव, सबसे नजदीकी मंडी, या फसल की जानकारी पूछ सकते हैं।",
    highestPrice: (crop, mandi, state, price, date) =>
      `${crop} का सबसे ज्यादा भाव ${price} रुपये प्रति क्विंटल है, ${state} की ${mandi} मंडी में${date ? `, ${date} तक` : ""}।`,
    nearestBest: (crop, mandi, price, km) =>
      `आपके पास ${crop} का सबसे अच्छा भाव ${price} रुपये प्रति क्विंटल है, ${mandi} मंडी में, लगभग ${km} किलोमीटर दूर।`,
    noneNearby: (crop, radius, mandi, state, price, km) =>
      `आज ${radius} किलोमीटर के भीतर किसी मंडी ने ${crop} का भाव दर्ज नहीं किया। सबसे नजदीकी मंडी जिसने दर्ज किया वह ${state} की ${mandi} मंडी है, लगभग ${km} किलोमीटर दूर, भाव ${price} रुपये प्रति क्विंटल।`,
    nearestMandiList: (mandi, district, km, count, radius) =>
      `आपकी सबसे नजदीकी मंडी ${mandi} है, ${district} में, लगभग ${km} किलोमीटर दूर।${count ? ` ${radius} किलोमीटर के भीतर ${count} मंडियां हैं।` : ""} आप किस फसल का भाव जानना चाहते हैं?`,
    priceAt: (crop, place, price) =>
      `${place} में ${crop} लगभग ${price} रुपये प्रति क्विंटल बिक रहा है।`,
    priceAverage: (crop, price, count) =>
      `आज ${count} मंडियों में ${crop} का औसत भाव ${price} रुपये प्रति क्विंटल है।`,
    noData: (crop) =>
      `माफ कीजिए, आज ${crop} का भाव नहीं मिला। हर मंडी हर फसल की रिपोर्ट रोज नहीं देती। कृपया कोई और फसल पूछें।`,
    noPlaceData: (crop, place) =>
      `${place} में आज ${crop} का भाव नहीं मिला। क्या मैं सबसे ज्यादा भाव बताऊँ?`,
    arrivalUnavailable: (crop) =>
      `माफ कीजिए, आवक की जानकारी उपलब्ध नहीं है। हम जिस सरकारी सेवा का उपयोग करते हैं वह केवल भाव देती है, आवक नहीं। मैं ${crop || "फसल"} का भाव बता सकता हूँ।`,
    needLocation:
      "नजदीकी मंडी बताने के लिए मुझे आपका स्थान चाहिए। कृपया लोकेशन की अनुमति दें, या अपना जिला बताएं।",
    clarify:
      "माफ कीजिए, मैं समझ नहीं पाया। आप पूछ सकते हैं: प्याज का भाव क्या है, या, मेरे पास टमाटर की सबसे अच्छी मंडी कौन सी है?",
    lowConfidence: "मुझे ठीक से सुनाई नहीं दिया। कृपया दोबारा बोलिए।",
    noCrop: "आप किस फसल के बारे में जानना चाहते हैं? जैसे प्याज, गेहूं या टमाटर।",
    goodbye: "धन्यवाद, आपकी बिक्री शुभ हो।",
  },

  mr: {
    greeting:
      "नमस्कार! मी तुमचा कृषी सहाय्यक आहे. तुम्ही मला मंडईचे भाव, सर्वात जवळची मंडई, किंवा पिकांची माहिती विचारू शकता.",
    // NOTE ON GRAMMAR: Marathi builds the possessive by changing the
    // noun's stem - कांदा + चा becomes कांद्याचा, not "कांदा चा". Doing
    // that correctly needs per-noun morphology, so these sentences are
    // phrased to let the crop name stand on its own instead. It reads
    // naturally and avoids generating wrong Marathi.
    highestPrice: (crop, mandi, state, price, date) =>
      `${crop} साठी सर्वात जास्त भाव ${price} रुपये प्रति क्विंटल आहे, ${state} मधील ${mandi} मंडईत${date ? `, ${date} पर्यंत` : ""}.`,
    nearestBest: (crop, mandi, price, km) =>
      `तुमच्या जवळ ${crop} साठी सर्वोत्तम भाव ${price} रुपये प्रति क्विंटल आहे, ${mandi} मंडईत, सुमारे ${km} किलोमीटर अंतरावर.`,
    noneNearby: (crop, radius, mandi, state, price, km) =>
      `आज ${radius} किलोमीटरच्या आत कोणत्याही मंडईने ${crop} साठी भाव नोंदवला नाही. सर्वात जवळची नोंद ${state} मधील ${mandi} मंडईची आहे, सुमारे ${km} किलोमीटर अंतरावर, भाव ${price} रुपये प्रति क्विंटल.`,
    nearestMandiList: (mandi, district, km, count, radius) =>
      `तुमच्या सर्वात जवळची मंडई ${mandi} आहे, ${district} मध्ये, सुमारे ${km} किलोमीटर अंतरावर.${count ? ` ${radius} किलोमीटरच्या आत ${count} मंडया आहेत.` : ""} तुम्हाला कोणत्या पिकाचा भाव हवा?`,
    priceAt: (crop, place, price) =>
      `${place} मध्ये ${crop} अंदाजे ${price} रुपये प्रति क्विंटल विकला जात आहे.`,
    priceAverage: (crop, price, count) =>
      `आज ${count} मंडयांमध्ये ${crop} साठी सरासरी भाव ${price} रुपये प्रति क्विंटल आहे.`,
    noData: (crop) =>
      `माफ करा, आज ${crop} साठी भाव मिळाला नाही. प्रत्येक मंडई दररोज प्रत्येक पिकाची नोंद देत नाही. कृपया दुसरे पीक विचारा.`,
    noPlaceData: (crop, place) =>
      `${place} मध्ये आज ${crop} साठी भाव मिळाला नाही. मी सर्वात जास्त भाव सांगू का?`,
    arrivalUnavailable: (crop) =>
      `माफ करा, आवकेची माहिती उपलब्ध नाही. आम्ही वापरत असलेली सरकारी सेवा फक्त भाव देते, आवक नाही. मी ${crop || "पिकासाठी"} भाव सांगू शकतो.`,
    needLocation:
      "सर्वात जवळची मंडई सांगण्यासाठी मला तुमचे स्थान हवे. कृपया लोकेशनला परवानगी द्या, किंवा तुमचा जिल्हा सांगा.",
    clarify:
      "माफ करा, मला समजले नाही. तुम्ही विचारू शकता: कांद्याचा भाव काय आहे, किंवा, माझ्या जवळ टोमॅटोसाठी सर्वोत्तम मंडई कोणती?",
    lowConfidence: "मला नीट ऐकू आले नाही. कृपया पुन्हा सांगा.",
    noCrop: "तुम्हाला कोणत्या पिकाबद्दल जाणून घ्यायचे आहे? उदाहरणार्थ कांदा, गहू किंवा टोमॅटो.",
    goodbye: "धन्यवाद, तुमची विक्री चांगली होवो.",
  },
};

// The languages this assistant speaks. `speechLang` is the BCP-47 tag
// handed to the browser's SpeechRecognition and SpeechSynthesis.
const VOICE_LANGUAGES = [
  { code: "en", speechLang: "en-IN", label: "English", nativeLabel: "English" },
  { code: "hi", speechLang: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", speechLang: "mr-IN", label: "Marathi", nativeLabel: "मराठी" },
];

module.exports = {
  CROP_NAMES_DEVANAGARI,
  CROP_DISPLAY_NAMES,
  cropDisplayName,
  INTENT_KEYWORDS,
  PLACE_CONNECTORS,
  REPLIES,
  VOICE_LANGUAGES,
};
