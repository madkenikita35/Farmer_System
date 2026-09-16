// config/ocrDictionaries.js
// -----------------------------------------------------------------------
// All the "word lists" the receipt scanner matches against, kept in one
// file so services/ocrService.js stays focused on the LOGIC rather than
// being 400 lines of vocabulary.
//
// WHY ALIASES MATTER SO MUCH HERE
// A real mandi invoice rarely says "Coriander". It says "DHANIYA".
// A Maharashtra slip says "KANDA", not "Onion". If we only looked for
// the English name, we'd find nothing on most real receipts.
//
// So every crop below lists the names it's actually printed under -
// Hindi, Marathi, and common trade spellings. The scanner matches ANY
// of them and reports the standard English name, because that's what
// the government price API expects when we look the crop up.
//
// ONE RULE WHEN ADDING ALIASES: never use a word that is also an
// ordinary English word. We originally listed "us" as an alias for
// Sugarcane (it is the Hindi name) and the scanner then reported
// "Sugarcane" on every invoice containing the word "us". Two- and
// three-letter aliases are where this bites - prefer the longer spelling.
//
// HOW TO ADD A CROP (a good first change to make):
//   { name: "Sesame", aliases: ["til", "tilli", "gingelly"] }
// The `name` is what gets saved; the aliases are just extra spellings
// we'll recognise. You never need to add plurals or case variations -
// the matcher handles those already.
// -----------------------------------------------------------------------

// ---------------------------------------------------------------------
// 1. CROPS
// ---------------------------------------------------------------------
const CROPS = [
  // --- Cereals & grains ---
  { name: "Wheat", aliases: ["gehu", "gehun", "gahu", "kanak", "godhi"] },
  { name: "Rice", aliases: ["chawal", "tandul", "akki"] },
  { name: "Paddy", aliases: ["dhan", "dhaan", "bhat", "nellu"] },
  { name: "Maize", aliases: ["makka", "makai", "corn", "bhutta"] },
  { name: "Bajra", aliases: ["pearl millet", "sajje", "kambu"] },
  { name: "Jowar", aliases: ["sorghum", "jwari", "cholam"] },
  { name: "Ragi", aliases: ["finger millet", "nachni", "mandua"] },
  { name: "Barley", aliases: ["jau", "jav"] },

  // --- Pulses ---
  { name: "Tur", aliases: ["arhar", "toor", "pigeon pea", "tuvar"] },
  { name: "Gram", aliases: ["chana", "chickpea", "bengal gram", "harbara"] },
  { name: "Moong", aliases: ["mung", "green gram", "mug"] },
  { name: "Urad", aliases: ["udid", "black gram", "urd"] },
  { name: "Lentil", aliases: ["masoor", "masur", "red lentil"] },
  { name: "Peas", aliases: ["matar", "vatana", "green peas"] },
  { name: "Rajma", aliases: ["kidney bean"] },
  { name: "Cowpea", aliases: ["chawli", "lobia"] },

  // --- Oilseeds ---
  { name: "Soyabean", aliases: ["soybean", "soya", "soyabin"] },
  { name: "Mustard", aliases: ["sarso", "sarson", "rai", "mohri", "rapeseed"] },
  { name: "Groundnut", aliases: ["moongphali", "peanut", "shengdana", "bhuimug"] },
  { name: "Sunflower", aliases: ["surajmukhi", "suryaphool"] },
  { name: "Sesame", aliases: ["til", "tilli", "gingelly", "teel"] },
  { name: "Castor", aliases: ["arandi", "erandi"] },
  { name: "Linseed", aliases: ["alsi", "flaxseed", "jawas"] },
  { name: "Safflower", aliases: ["kardi", "kusum"] },

  // --- Spices (very common on trader invoices) ---
  { name: "Coriander", aliases: ["dhaniya", "dhania", "kothimbir", "coriandar"] },
  { name: "Cumin", aliases: ["jeera", "jira", "zeera"] },
  { name: "Turmeric", aliases: ["haldi", "halad", "arishina"] },
  { name: "Chilli", aliases: ["chili", "mirch", "mirchi", "lal mirch", "red chilli"] },
  { name: "Fenugreek", aliases: ["methi", "methi seed"] },
  { name: "Fennel", aliases: ["saunf", "sonf", "badishep"] },
  { name: "Ajwain", aliases: ["carom", "ajmo", "owa"] },
  { name: "Garlic", aliases: ["lehsun", "lasun", "lahsun"] },
  { name: "Ginger", aliases: ["adrak", "ale", "aadu"] },
  { name: "Isabgol", aliases: ["psyllium"] },
  { name: "Guar", aliases: ["guar seed", "cluster bean", "gawar"] },

  // --- Vegetables ---
  { name: "Onion", aliases: ["kanda", "pyaz", "pyaaz", "ulli"] },
  { name: "Potato", aliases: ["aloo", "alu", "batata"] },
  { name: "Tomato", aliases: ["tamatar", "tomato hybrid"] },
  { name: "Brinjal", aliases: ["baingan", "vangi", "eggplant"] },
  { name: "Cabbage", aliases: ["patta gobhi", "kobi"] },
  { name: "Cauliflower", aliases: ["phool gobhi", "gobi", "flower"] },
  { name: "Carrot", aliases: ["gajar"] },
  { name: "Cucumber", aliases: ["kheera", "kakdi"] },
  { name: "Bhindi", aliases: ["okra", "ladies finger", "bhendi"] },
  { name: "Bottle Gourd", aliases: ["lauki", "dudhi"] },
  { name: "Bitter Gourd", aliases: ["karela"] },
  { name: "Pumpkin", aliases: ["kaddu", "bhopla"] },
  { name: "Spinach", aliases: ["palak"] },
  { name: "Capsicum", aliases: ["shimla mirch", "bell pepper"] },
  { name: "Beans", aliases: ["french beans", "frasbean", "farasbi"] },

  // --- Fruits ---
  { name: "Banana", aliases: ["kela", "keli"] },
  { name: "Mango", aliases: ["aam", "amba"] },
  { name: "Grapes", aliases: ["angoor", "draksha"] },
  { name: "Apple", aliases: ["seb", "safarchand"] },
  { name: "Orange", aliases: ["santra", "narangi"] },
  { name: "Pomegranate", aliases: ["anar", "dalimb"] },
  { name: "Papaya", aliases: ["papita"] },
  { name: "Guava", aliases: ["amrud", "peru"] },
  { name: "Lemon", aliases: ["nimbu", "limbu", "lime"] },
  { name: "Watermelon", aliases: ["tarbooj", "kalingad"] },

  // --- Cash crops ---
  { name: "Cotton", aliases: ["kapas", "kapus", "narma"] },
  { name: "Sugarcane", aliases: ["ganna", "sherdi", "ikshu"] },
  { name: "Jute", aliases: [] },
  { name: "Tobacco", aliases: ["tambakhu"] },
  { name: "Coconut", aliases: ["nariyal", "naral", "copra"] },
  { name: "Cashew", aliases: ["kaju"] },
];

// ---------------------------------------------------------------------
// 2. STATES
// ---------------------------------------------------------------------
// Aliases here cover both local spellings and the odd names the
// government's own dataset uses (it writes "Keralam", not "Kerala").
const STATES = [
  { name: "Maharashtra", aliases: ["mh"] },
  { name: "Madhya Pradesh", aliases: ["mp", "madhyapradesh"] },
  { name: "Uttar Pradesh", aliases: ["up", "uttarpradesh"] },
  { name: "Rajasthan", aliases: ["raj"] },
  { name: "Gujarat", aliases: ["guj"] },
  { name: "Punjab", aliases: [] },
  { name: "Haryana", aliases: [] },
  { name: "Karnataka", aliases: ["mysore"] },
  { name: "Tamil Nadu", aliases: ["tamilnadu", "tn"] },
  { name: "Andhra Pradesh", aliases: ["andhrapradesh", "ap"] },
  { name: "Telangana", aliases: [] },
  { name: "Bihar", aliases: [] },
  { name: "West Bengal", aliases: ["westbengal", "wb"] },
  { name: "Odisha", aliases: ["orissa"] },
  { name: "Kerala", aliases: ["keralam"] },
  { name: "Delhi", aliases: ["new delhi", "nct"] },
  { name: "Chhattisgarh", aliases: ["chattisgarh"] },
  { name: "Jharkhand", aliases: [] },
  { name: "Assam", aliases: [] },
  { name: "Himachal Pradesh", aliases: ["himachalpradesh", "hp"] },
  { name: "Uttarakhand", aliases: ["uttaranchal"] },
  { name: "Jammu and Kashmir", aliases: ["jammu", "kashmir", "j&k"] },
  { name: "Goa", aliases: [] },
  { name: "Tripura", aliases: [] },
  { name: "Manipur", aliases: [] },
  { name: "Meghalaya", aliases: [] },
  { name: "Nagaland", aliases: [] },
  { name: "Mizoram", aliases: [] },
  { name: "Sikkim", aliases: [] },
  { name: "Arunachal Pradesh", aliases: ["arunachalpradesh"] },
  { name: "Chandigarh", aliases: [] },
  { name: "Puducherry", aliases: ["pondicherry"] },
];

// ---------------------------------------------------------------------
// 3. UNITS  -  the heart of "scan any unit, not just quintals"
// ---------------------------------------------------------------------
// The app stores everything in QUINTALS (1 quintal = 100 kg), because
// that's what the government price dataset uses. So each unit we
// recognise needs a multiplier to convert it.
//
// `assumed: true` marks units whose size ISN'T fixed by law - a "bag"
// of wheat and a "bag" of onions can weigh different amounts. We still
// convert them (a rough number beats no number), but we tell the user
// we guessed, so they can correct it on the review screen.
const UNITS = [
  // Exact, standard units
  { match: ["quintal", "quintals", "qtl", "qtls", "qntl", "qty in qtl", "ql"], toQuintal: 1 },
  { match: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms", "kilo gram"], toQuintal: 0.01 },
  { match: ["gram", "grams", "gm", "gms", "g"], toQuintal: 0.00001 },
  { match: ["tonne", "tonnes", "ton", "tons", "mt", "metric ton", "metric tonne"], toQuintal: 10 },

  // Units whose weight varies - we convert with a common assumption
  { match: ["bag", "bags", "bori", "boris", "katta", "kattas", "gunny"], toQuintal: 0.5, assumed: true, note: "assumed 50 kg per bag" },
  { match: ["maund", "maunds"], toQuintal: 0.4, assumed: true, note: "assumed 40 kg per maund" },
  { match: ["crate", "crates"], toQuintal: 0.2, assumed: true, note: "assumed 20 kg per crate" },
  { match: ["box", "boxes", "peti", "petis"], toQuintal: 0.2, assumed: true, note: "assumed 20 kg per box" },
];

// ---------------------------------------------------------------------
// 4. KEYWORD VARIANTS
// ---------------------------------------------------------------------
// OCR mangles words in predictable ways: "MANDI" comes out as "MANDEL",
// "WEIGHT" as "WEGNT". Rather than rely on fuzzy matching for these
// short, critical keywords (where fuzzy matching gets risky), we just
// list the misreadings we've actually seen.
const KEYWORDS = {
  // Words that mark a market/mandi name
  mandi: ["mandi", "mandee", "mandl", "mandel", "mandi.", "manoi", "mand1", "mandil", "mandy"],
  market: ["market", "apmc", "a.p.m.c", "bazar", "bazaar", "yard", "krishi upaj", "samiti"],

  // Words that introduce a weight
  weight: ["weight", "wt", "wgt", "wegnt", "wieght", "weigth", "net wt", "net weight", "gross wt", "gross weight"],

  // Words that introduce a per-unit rate
  rate: ["rate", "price", "bhav", "bhaav", "dar", "per qtl", "per quintal", "per kg", "rate/qtl"],

  // Words that introduce a total money value
  amount: ["amount", "value", "taxable value", "taxable amount", "total", "net amount", "grand total", "gross amount"],

  // Words that introduce the crop/goods
  goods: ["description of goods", "description", "commodity", "crop", "item", "particulars", "goods", "produce"],
};

module.exports = { CROPS, STATES, UNITS, KEYWORDS };
