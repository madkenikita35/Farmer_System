// config/cropCategories.js
// -----------------------------------------------------------------------
// Sorts a crop name into a group: fruits, vegetables, cereals and so on.
//
// WHY THIS EXISTS
// A single mandi lists up to ~70 crops. One bar chart with 70 bars is
// unreadable - the labels overlap and nothing stands out. Split by
// group, you get five or six short charts where you can actually
// compare like with like: tomato against brinjal, not tomato against
// cardamom (which costs 200x more and flattens every other bar to
// nothing).
//
// ---------------------------------------------------------------------
// WHY A BIG LIST INSTEAD OF CLEVER RULES
// ---------------------------------------------------------------------
// The government feed uses ~206 commodity names, and they do not follow
// a pattern you can reliably match on. "Green Chilli" is a vegetable
// but "Dry Chillies" is a spice. "Bengal Gram(Gram)(Whole)" is a pulse
// but "Gram Raw(Chholia)" is eaten as a vegetable. "Coconut" is sold as
// a fruit, "Coconut Seed" is an oilseed.
//
// Guessing from keywords gets those wrong. So the names we have seen
// are listed explicitly below, and KEYWORD_RULES is only a safety net
// for a name the feed adds later that is not in the list yet.
//
// TO ADD A CROP: put its lowercase name in the right array below. That
// is the whole job.
// -----------------------------------------------------------------------

// The group keys. The frontend turns these into words in the farmer's
// language (see cat_* in i18n/translations.js), so they must stay as
// these short English codes and not become display text.
const CATEGORIES = [
  "fruits",
  "vegetables",
  "cereals",
  "pulses",
  "oilseeds",
  "spices",
  "flowers",
  "other",
];

const CROPS_BY_CATEGORY = {
  fruits: [
    "apple", "banana", "banana - green", "chikoos(sapota)", "custard apple(sharifa)",
    "fig(anjura/anjeer)", "galgal(lemon)", "grapes", "guava", "jack fruit(ripe)",
    "karbuja(musk melon)", "lemon", "lime", "mango", "mango(raw-ripe)",
    "mousambi(sweet lime)", "orange", "papaya", "papaya(raw)", "pear(marasebu)",
    "persimon(japani fal)", "pineapple", "plum", "pomegranate", "ramphal",
    "seetapal", "tamarind fruit", "water melon", "amla(nelli kai)", "coconut",
    "tender coconut", "water chestnut",
  ],

  vegetables: [
    "alsandikai", "amaranthus", "amranthas red", "ashgourd", "baby corn", "beans",
    "beetroot", "bhindi(ladies finger)", "bitter gourd", "bottle gourd", "brinjal",
    "cabbage", "capsicum", "carrot", "cauliflower", "chapparad avare", "chow chow",
    "cluster beans", "colacasia", "coriander(leaves)", "cowpea(veg)",
    "cucumbar(kheera)", "drumstick", "duster beans",
    "elephant yam(suran)/amorphophallus", "french beans(frasbean)", "green avare(w)",
    "green chilli", "green peas", "chilly capsicum", "indian beans(seam)", "kakada",
    "knool khol", "ladies finger", "leafy vegetable", "little gourd(kundru)",
    "long melon(kakri)", "mashrooms", "methi(leaves)", "mint(pudina)", "onion",
    "onion green", "other green and fresh vegetables", "pea pod/pea cod/हरी मटर",
    "peas wet", "pointed gourd(parval)", "potato", "pumpkin", "raddish",
    "ridge gourd(permal/hybrid gourd)", "ridgeguard(tori)", "round gourd",
    "seemebadnekai", "snakeguard", "spinach", "spiny gourd / kartali(kantola)",
    "sponge gourd", "squash(chappal kadoo)", "surat beans(papadi)", "sweet corn",
    "sweet potato", "sweet pumpkin", "sweet saag", "tapioca", "thogrikai",
    "thondekai", "tinda", "tomato", "turnip", "wild cucumber", "yam", "yam(ratalu)",
    "gram raw(chholia)", "betal leaves",
  ],

  cereals: [
    "bajra(pearl millet/cumbu)", "barley(jau)", "broken rice", "foxtail millet(navane)",
    "jowar(sorghum)", "kutki", "maize", "paddy(basmati)", "paddy(common)",
    "ragi(finger millet)", "rice", "wheat", "rajgir",
  ],

  pulses: [
    "alasande gram", "avare dal", "bengal gram dal(chana dal)",
    "bengal gram(gram)(whole)", "big gram", "black gram dal(urd dal)",
    "black gram(urd beans)(whole)", "chennangi dal", "cowpea(lobia/karamani)",
    "field bean(anumulu)", "field pea", "green gram dal(moong dal)",
    "green gram(moong)(whole)", "guar", "guar seed(cluster beans seed)",
    "kabuli chana(chickpeas-white)", "kulthi(horse gram)", "lak(teora)",
    "lentil(masur)(whole)", "masur dal", "moath dal", "other pulses", "peas(dry)",
    "pegeon pea(arhar fali)", "red gram split/arhar dal/tur dal",
    "red gram/arhar/tur(whole)", "white peas",
  ],

  oilseeds: [
    "castor seed", "coconut oil", "coconut seed", "copra", "ground nut seed",
    "groundnut", "groundnut pods(raw)", "groundnut(split)", "mentha oil", "mustard",
    "safflower", "sesamum(sesame,gingelly,til)", "soyabean",
    "sunflower/sunflower seed",
  ],

  spices: [
    "ajwan", "black pepper", "cardamom", "chili red", "cinamon(dalchini)",
    "corriander seed", "cummin seed(jeera)", "dry chillies", "garlic", "ginger(dry)",
    "ginger(green)", "methi seeds", "soanf", "suva(dill seed)", "turmeric",
    "turmeric(raw)",
  ],

  flowers: [
    "flowers-others", "jasmine", "marigold(calcutta)", "rose(local)", "rose(loose))",
    "tube flower", "tube rose(loose)",
  ],

  other: [
    "almond(badam)", "arecanut(betelnut/supari)", "buttery", "cashewnuts", "cock",
    "coffee", "cotton", "cow", "firewood", "fish", "ghee", "goat", "green fodder",
    "gur(jaggery)", "jute", "mahua", "prawn", "rubber", "sabu dan", "sugar",
    "tobacco", "white muesli", "wood",
  ],
};

// Flattened into one lookup so categorising a crop is a single map read
// rather than a scan of eight arrays.
const EXACT_LOOKUP = {};
for (const category of Object.keys(CROPS_BY_CATEGORY)) {
  for (const name of CROPS_BY_CATEGORY[category]) {
    EXACT_LOOKUP[name] = category;
  }
}

// The safety net, used ONLY when a name is not in the list above -
// i.e. when the government feed starts publishing something new.
//
// Order matters: the first rule that matches wins. Spices come before
// vegetables so "Dry Chillies" is not caught by a vegetable rule, and
// pulses come before vegetables so "...Dal" is not caught by "beans".
const KEYWORD_RULES = [
  { category: "flowers", words: ["flower", "rose", "jasmine", "marigold"] },
  { category: "spices", words: ["chilli", "chillies", "pepper", "turmeric", "cardamom", "jeera", "cumin", "clove", "dalchini", "coriander seed"] },
  { category: "pulses", words: [" dal", "dal)", "gram", "pulse", "lentil", "masur", "moong", "urd", "arhar", "tur(", "chana", "cowpea", "kulthi"] },
  { category: "oilseeds", words: ["seed", "oil", "groundnut", "mustard", "sesam", "soya", "sunflower", "castor", "copra"] },
  { category: "cereals", words: ["paddy", "rice", "wheat", "maize", "millet", "jowar", "bajra", "barley", "ragi"] },
  { category: "fruits", words: ["melon", "mango", "banana", "apple", "grape", "orange", "berry", "fruit"] },
  { category: "vegetables", words: ["gourd", "beans", "brinjal", "cabbage", "potato", "tomato", "onion", "leaves", "saag", "vegetable"] },
];

/**
 * Which group does this crop belong to?
 *
 * @param {string} cropName - as the government feed spells it
 * @returns {string} one of CATEGORIES; "other" when nothing matches
 */
function categoriseCrop(cropName) {
  if (!cropName) return "other";

  const name = String(cropName).trim().toLowerCase();

  // 1. The name we already know about.
  if (EXACT_LOOKUP[name]) return EXACT_LOOKUP[name];

  // 2. A name we have not seen - fall back to keywords.
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((word) => name.includes(word))) {
      return rule.category;
    }
  }

  // 3. Genuinely unknown. "other" is honest; guessing would not be.
  return "other";
}

module.exports = { categoriseCrop, CATEGORIES, CROPS_BY_CATEGORY };
