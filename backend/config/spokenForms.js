// config/spokenForms.js
// -----------------------------------------------------------------------
// Turns raw values into words the speech engine pronounces CORRECTLY in
// the language being spoken.
//
// =======================================================================
// WHY THIS FILE HAD TO EXIST
// =======================================================================
// The voice assistant used to hand SpeechSynthesis strings like:
//
//     "कांदा साठी सर्वात जास्त भाव 11,250 रुपये ... 16/09/2026 पर्यंत."
//
// Four things in that sentence are pronounced wrongly:
//
//   "16/09/2026"  - read as digits and slashes, and the engine usually
//                   drops out of Marathi to do it. This is the one that
//                   sounds most obviously broken.
//   "11,250"      - the comma splits the number, so it comes out as
//                   "eleven comma two hundred fifty" or in English.
//   "Tamil Nadu"  - Latin script inside a Devanagari sentence makes the
//                   engine switch to English phonetics mid-sentence.
//   "139"         - a bare numeral, read in whatever the voice defaults to.
//
// WHY WORDS AND NOT DEVANAGARI DIGITS
// Writing "११,२५०" would be less code, and a true Marathi voice would
// read it in Marathi. But most devices have NO Marathi voice, so Marathi
// text is read by a HINDI voice (see pickVoice in VoiceAssistant.jsx).
// A Hindi voice given Devanagari digits says Hindi numbers - which is
// exactly the complaint this file fixes.
//
// Spelled-out words remove the choice from the engine. Given
// "अकरा हजार दोनशे पन्नास", even a Hindi voice pronounces Marathi words:
// accented, but unmistakably Marathi.
//
// Only the SPOKEN string changes. The `data` object in every response
// still carries the raw numbers, so the on-screen transcript shows
// "₹11,250/quintal" as before.
// -----------------------------------------------------------------------

// ---------------------------------------------------------------------
// 0-99, written out. These are irregular in both languages - you cannot
// build "इक्यावन" or "एक्कावन्न" from a rule - so they are listed.
// ---------------------------------------------------------------------

const HINDI_0_TO_99 = [
  "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
  "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
  "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस",
  "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस",
  "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास",
  "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ",
  "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर",
  "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उन्यासी",
  "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी",
  "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे",
];

const MARATHI_0_TO_99 = [
  "शून्य", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ",
  "दहा", "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सतरा", "अठरा", "एकोणीस",
  "वीस", "एकवीस", "बावीस", "तेवीस", "चोवीस", "पंचवीस", "सव्वीस", "सत्तावीस", "अठ्ठावीस", "एकोणतीस",
  "तीस", "एकतीस", "बत्तीस", "तेहतीस", "चौतीस", "पस्तीस", "छत्तीस", "सदतीस", "अडतीस", "एकोणचाळीस",
  "चाळीस", "एकेचाळीस", "बेचाळीस", "त्रेचाळीस", "चव्वेचाळीस", "पंचेचाळीस", "सेहेचाळीस", "सत्तेचाळीस", "अठ्ठेचाळीस", "एकोणपन्नास",
  "पन्नास", "एक्कावन्न", "बावन्न", "त्रेपन्न", "चोपन्न", "पंचावन्न", "छप्पन्न", "सत्तावन्न", "अठ्ठावन्न", "एकोणसाठ",
  "साठ", "एकसष्ट", "बासष्ट", "त्रेसष्ट", "चौसष्ट", "पासष्ट", "सहासष्ट", "सदुसष्ट", "अडुसष्ट", "एकोणसत्तर",
  "सत्तर", "एकाहत्तर", "बाहत्तर", "त्र्याहत्तर", "चौऱ्याहत्तर", "पंचाहत्तर", "शहात्तर", "सत्याहत्तर", "अठ्ठ्याहत्तर", "एकोणऐंशी",
  "ऐंशी", "एक्याऐंशी", "ब्याऐंशी", "त्र्याऐंशी", "चौऱ्याऐंशी", "पंच्याऐंशी", "शहाऐंशी", "सत्त्याऐंशी", "अठ्ठ्याऐंशी", "एकोणनव्वद",
  "नव्वद", "एक्याण्णव", "ब्याण्णव", "त्र्याण्णव", "चौऱ्याण्णव", "पंच्याण्णव", "शहाण्णव", "सत्त्याण्णव", "अठ्ठ्याण्णव", "नव्याण्णव",
];

// Marathi hundreds are single words (दोनशे), not "दोन" + "शे".
//
// 100 is the exception: on its own it is "शंभर", but with anything after
// it the form changes to "एकशे" - 139 is "एकशे एकोणचाळीस", never
// "शंभर एकोणचाळीस". MARATHI_HUNDRED_PREFIX holds that second form.
const MARATHI_HUNDREDS = [
  "", "शंभर", "दोनशे", "तीनशे", "चारशे", "पाचशे", "सहाशे", "सातशे", "आठशे", "नऊशे",
];
const MARATHI_HUNDRED_PREFIX = "एकशे";

const ENGLISH_0_TO_19 = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const ENGLISH_TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

// Indian place-value words. Note Marathi uses कोटी, Hindi करोड़.
const SCALE = {
  hi: { hundred: "सौ", thousand: "हज़ार", lakh: "लाख", crore: "करोड़" },
  mr: { hundred: null, thousand: "हजार", lakh: "लाख", crore: "कोटी" },
};

// ---------------------------------------------------------------------
// numberToWords
// ---------------------------------------------------------------------

/** Under 100, in the target language. */
function under100(n, lang) {
  if (lang === "hi") return HINDI_0_TO_99[n];
  if (lang === "mr") return MARATHI_0_TO_99[n];

  if (n < 20) return ENGLISH_0_TO_19[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0
    ? ENGLISH_TENS[tens]
    : `${ENGLISH_TENS[tens]}-${ENGLISH_0_TO_19[ones]}`;
}

/** Under 1000, in the target language. */
function under1000(n, lang) {
  if (n < 100) return under100(n, lang);

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (lang === "mr") {
    // "दोनशे पन्नास" - the hundred word already contains the digit.
    // 100 takes its combining form when something follows it.
    const head =
      hundreds === 1 && rest > 0 ? MARATHI_HUNDRED_PREFIX : MARATHI_HUNDREDS[hundreds];
    return rest === 0 ? head : `${head} ${under100(rest, lang)}`;
  }

  if (lang === "hi") {
    const head = `${HINDI_0_TO_99[hundreds]} ${SCALE.hi.hundred}`;
    return rest === 0 ? head : `${head} ${under100(rest, lang)}`;
  }

  const head = `${ENGLISH_0_TO_19[hundreds]} hundred`;
  return rest === 0 ? head : `${head} ${under100(rest, lang)}`;
}

/**
 * Writes a whole number out in words, using the INDIAN place-value
 * system (thousand → lakh → crore), which is what these numbers mean to
 * the person hearing them. 1,12,500 is "one lakh twelve thousand five
 * hundred", not "one hundred twelve thousand".
 *
 * @param {number} value
 * @param {"en"|"hi"|"mr"} lang
 * @returns {string} words, or the plain digits if something is off
 */
function numberToWords(value, lang = "en") {
  const n = Math.round(Number(value));

  // Guard rails: anything not a sane whole number goes back as digits
  // rather than producing nonsense.
  if (!Number.isFinite(n) || n < 0) return String(value);
  if (n > 99999999) return String(n); // beyond crore - say the digits

  const language = ["en", "hi", "mr"].includes(lang) ? lang : "en";
  if (n === 0) return under100(0, language);

  const scale = SCALE[language] || { thousand: "thousand", lakh: "lakh", crore: "crore" };
  const parts = [];

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${under1000(crore, language)} ${scale.crore || "crore"}`);
  if (lakh) parts.push(`${under1000(lakh, language)} ${scale.lakh || "lakh"}`);
  if (thousand) parts.push(`${under1000(thousand, language)} ${scale.thousand || "thousand"}`);
  if (rest) parts.push(under1000(rest, language));

  return parts.join(" ");
}

// ---------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------

const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June",
       "July", "August", "September", "October", "November", "December"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
       "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
  mr: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
       "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
};

/**
 * "16/09/2026" -> "सोळा सप्टेंबर दोन हजार सव्वीस"  (mr)
 *              -> "सोलह सितंबर दो हज़ार छब्बीस"     (hi)
 *              -> "sixteen September two thousand twenty-six" (en)
 *
 * The government feed gives dates as DD/MM/YYYY. Fed to TTS as-is, the
 * slashes are read aloud and the digits pull the voice out of the
 * sentence's language - the single most noticeable pronunciation bug in
 * the assistant.
 */
function spokenDate(ddmmyyyy, lang = "en") {
  if (!ddmmyyyy || typeof ddmmyyyy !== "string") return "";

  const match = ddmmyyyy.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!match) return ddmmyyyy; // not a shape we know - leave it alone

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  if (month < 1 || month > 12 || day < 1 || day > 31) return ddmmyyyy;

  return `${numberToWords(day, lang)} ${months[month - 1]} ${numberToWords(year, lang)}`;
}

// ---------------------------------------------------------------------
// Place names
// ---------------------------------------------------------------------

// State names in Devanagari. A Latin name inside a Marathi sentence
// makes the engine switch to English phonetics for those words, so the
// ones we CAN translate, we do. Both spellings are given because Marathi
// and Hindi genuinely differ (केरळ vs केरल, तेलंगणा vs तेलंगाना).
const STATE_NAMES_SPOKEN = {
  "Maharashtra": { hi: "महाराष्ट्र", mr: "महाराष्ट्र" },
  "Madhya Pradesh": { hi: "मध्य प्रदेश", mr: "मध्य प्रदेश" },
  "Uttar Pradesh": { hi: "उत्तर प्रदेश", mr: "उत्तर प्रदेश" },
  "Andhra Pradesh": { hi: "आंध्र प्रदेश", mr: "आंध्र प्रदेश" },
  "Arunachal Pradesh": { hi: "अरुणाचल प्रदेश", mr: "अरुणाचल प्रदेश" },
  "Himachal Pradesh": { hi: "हिमाचल प्रदेश", mr: "हिमाचल प्रदेश" },
  "Tamil Nadu": { hi: "तमिलनाडु", mr: "तमिळनाडू" },
  "Karnataka": { hi: "कर्नाटक", mr: "कर्नाटक" },
  "Kerala": { hi: "केरल", mr: "केरळ" },
  "Keralam": { hi: "केरल", mr: "केरळ" },
  "Telangana": { hi: "तेलंगाना", mr: "तेलंगणा" },
  "Gujarat": { hi: "गुजरात", mr: "गुजरात" },
  "Rajasthan": { hi: "राजस्थान", mr: "राजस्थान" },
  "Punjab": { hi: "पंजाब", mr: "पंजाब" },
  "Haryana": { hi: "हरियाणा", mr: "हरियाणा" },
  "Bihar": { hi: "बिहार", mr: "बिहार" },
  "Jharkhand": { hi: "झारखंड", mr: "झारखंड" },
  "Odisha": { hi: "ओडिशा", mr: "ओडिशा" },
  "West Bengal": { hi: "पश्चिम बंगाल", mr: "पश्चिम बंगाल" },
  "Assam": { hi: "असम", mr: "आसाम" },
  "Chhattisgarh": { hi: "छत्तीसगढ़", mr: "छत्तीसगड" },
  "Chattisgarh": { hi: "छत्तीसगढ़", mr: "छत्तीसगड" },
  "Uttarakhand": { hi: "उत्तराखंड", mr: "उत्तराखंड" },
  "Goa": { hi: "गोवा", mr: "गोवा" },
  "Delhi": { hi: "दिल्ली", mr: "दिल्ली" },
  "NCT of Delhi": { hi: "दिल्ली", mr: "दिल्ली" },
  "Jammu and Kashmir": { hi: "जम्मू और कश्मीर", mr: "जम्मू आणि काश्मीर" },
  "Tripura": { hi: "त्रिपुरा", mr: "त्रिपुरा" },
  "Nagaland": { hi: "नागालैंड", mr: "नागालँड" },
  "Manipur": { hi: "मणिपुर", mr: "मणिपूर" },
  "Meghalaya": { hi: "मेघालय", mr: "मेघालय" },
  "Mizoram": { hi: "मिजोरम", mr: "मिझोराम" },
  "Sikkim": { hi: "सिक्किम", mr: "सिक्कीम" },
  "Chandigarh": { hi: "चंडीगढ़", mr: "चंदीगड" },
  "Puducherry": { hi: "पुद्दुचेरी", mr: "पुद्दुचेरी" },
  "Andaman and Nicobar": { hi: "अंडमान और निकोबार", mr: "अंदमान आणि निकोबार" },
};

/** A state's name as it should be SPOKEN in this language. */
function spokenState(englishName, lang = "en") {
  if (!englishName) return englishName;
  if (lang === "en") return englishName;
  const entry = STATE_NAMES_SPOKEN[englishName.trim()];
  return (entry && entry[lang]) || englishName;
}

/**
 * Cleans a mandi name for speaking.
 *
 * Mandi names are proper nouns in Latin script and there are hundreds of
 * them, so they cannot all be transliterated - a Marathi voice will
 * approximate "Vadaseri", and that is an accepted limitation.
 *
 * What we CAN fix is the boilerplate around the name. "APMC" is read out
 * as the English letters "ay-pee-em-see" in the middle of a Marathi
 * sentence, which sounds far worse than the name itself. Swapping it for
 * the local word for a market removes the worst of the jarring, and the
 * name still identifies the place.
 */
function spokenMandiName(name, lang = "en") {
  if (!name) return name;

  // English keeps every word - the words themselves are already English.
  // Only the punctuation is cleaned, because a voice reads
  // "Kahithapattarai(Uzhavar Sandhai )" with an odd stumble at the
  // bracket, and a stray "-" runs two names together.
  if (lang === "en") {
    return String(name)
      .replace(/[()\[\]{}]/g, " ")
      .replace(/&/g, " and ")
      .replace(/[-_/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const cleaned = String(name)
    // "APMC" is DROPPED, not translated. Every Hindi/Marathi reply
    // template already ends with मंडई / मंडी, so turning APMC into that
    // same word said it twice in one breath ("Vantamamidi मंडई मंडईची").
    // English keeps APMC, because the English templates say only
    // "at <mandi>" and never supply the word themselves.
    .replace(/\bA\.?P\.?M\.?C\.?\b/gi, " ")
    // "(F&V)" and similar bracketed codes are unreadable aloud
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, lang === "mr" ? " आणि " : " और ")
    // "Mumbai-Onion" is read as one run-on word; a space separates them.
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // A name that was nothing BUT "APMC" would now be empty, leaving a
  // hole in the sentence. Keep the original in that case.
  return cleaned || String(name).trim();
}

// ---------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------

/**
 * A rupee amount, spoken. Just the number in words - the reply templates
 * already supply "रुपये प्रति क्विंटल" around it.
 */
function spokenRupees(amount, lang = "en") {
  return numberToWords(amount, lang);
}

module.exports = {
  numberToWords,
  spokenDate,
  spokenState,
  spokenMandiName,
  spokenRupees,
  MONTH_NAMES,
  STATE_NAMES_SPOKEN,
};
