// config/placeMatching.js
// -----------------------------------------------------------------------
// Matches a place a farmer SPOKE against a place name in the government
// data, when the two are written in different scripts.
//
// =======================================================================
// THE BUG THIS FIXES
// =======================================================================
// "इंदौर में गेहूं का भाव" - one of the three examples the voice
// assistant itself suggests - always answered "no price found", while
// the identical English question worked fine.
//
// The reason: the place was extracted correctly as "इंदौर", but the
// government feed writes every market, district and state in LATIN
// script ("Indore", "Madhya Pradesh"). The old matching was a plain
//
//     `${market} ${district} ${state}`.toLowerCase().includes(wanted)
//
// and "indore madhya pradesh".includes("इंदौर") is false, always. Not a
// missing-data problem at all - the two strings simply could never
// match, in any script other than Latin.
//
// =======================================================================
// HOW THIS MATCHES INSTEAD: THE CONSONANT SKELETON
// =======================================================================
// Transliterating इंदौर letter by letter gives roughly "indaur", and
// comparing that to "indore" still fails an exact test - the vowels
// disagree. And they will keep disagreeing, because Hindi and English
// spell Indian place names with genuinely different vowels:
//
//     इंदौर  -> indaur   vs  Indore
//     नाशिक  -> naashik  vs  Nashik
//     मुंबई   -> mumbai   vs  Mumbai
//
// The CONSONANTS, though, line up almost every time. So both sides are
// reduced to consonants only and those are compared:
//
//     इंदौर -> n d r        Indore -> n d r        match
//     नाशिक -> n sh k       Nashik -> n s h k      match
//     मुंबई  -> m m b        Mumbai -> m m b        match
//
// This is the same idea as Soundex, cut down to the one part that
// actually transfers between the two scripts. It needs no dictionary of
// place names, so it works for any town the feed happens to carry -
// which matters, because there are thousands of them.
//
// WHERE IT CAN GO WRONG: dropping vowels makes names shorter and so
// easier to collide ("Pune" and "Panna" both reduce to "pn"). Two
// guards keep that in check - a skeleton under 3 letters must match a
// whole word rather than appear anywhere inside one, and matching is
// done per word instead of across a whole run-together string.
// -----------------------------------------------------------------------

// ---------------------------------------------------------------------
// Devanagari consonants -> their Latin sound.
//
// Vowels and matras are deliberately absent: they are dropped, and the
// Latin side has its vowels dropped too, so both end up comparable.
// ---------------------------------------------------------------------
const DEVANAGARI_CONSONANTS = {
  "क": "k",  "ख": "kh", "ग": "g",  "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "ch", "ज": "j",  "झ": "jh", "ञ": "n",
  "ट": "t",  "ठ": "th", "ड": "d",  "ढ": "dh", "ण": "n",
  "त": "t",  "थ": "th", "द": "d",  "ध": "dh", "न": "n",
  "प": "p",  "फ": "ph", "ब": "b",  "भ": "bh", "म": "m",
  // NOTE य (य / "ya") is deliberately NOT here. It is a semivowel
  // that usually dissolves into a vowel on the Latin side - Jaipur for
  // जयपुर, Ludhiana for लुधियाना - so keeping it produced a stray
  // consonant on one side only and broke the match. Dropping it on
  // BOTH sides (see the Latin branch) makes the two agree.
  "र": "r",  "ल": "l",  "व": "v",
  "ळ": "l",  "श": "sh", "ष": "sh", "स": "s",  "ह": "h",
  // The dotted (nukta) forms used for borrowed sounds.
  "क़": "k",  "ख़": "kh", "ग़": "g",  "ज़": "z",
  "ड़": "r",  "ढ़": "rh", "फ़": "f",
};

// Letters that make the anusvara (ं) sound like "m" rather than "n" -
// the labials. "मुंबई" is Mumbai, not Munbai.
const LABIALS = new Set(["प", "फ", "ब", "भ", "म"]);

// Dropped from the Latin side. "y" joins the vowels for the reason in
// the consonant table above.
const VOWELS_LATIN = new Set(["a", "e", "i", "o", "u", "y"]);

// Latin spellings of Indian names use letters Devanagari has no direct
// equivalent for. These fold them onto the sound Devanagari would use:
// Wardha/वर्धा agree once w is read as v, and Cuttack/कटक agree
// once a hard c is read as k. ("ch" is handled separately, since
// Chennai must stay ch and not become kh.)
const LATIN_FOLDING = { w: "v", q: "k", x: "ks" };

/**
 * Reduces one word, in EITHER script, to its consonant sounds.
 *
 * @param {string} word
 * @returns {string} e.g. "इंदौर" -> "ndr", "Indore" -> "ndr"
 */
function consonantSkeleton(word) {
  if (!word) return "";

  const text = String(word).trim();
  let out = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // ---- Devanagari ----
    if (DEVANAGARI_CONSONANTS[char]) {
      out += DEVANAGARI_CONSONANTS[char];
      continue;
    }

    // Anusvara: an "n" or "m" depending on what follows it.
    if (char === "ं" || char === "ँ") {
      const next = text[i + 1];
      out += LABIALS.has(next) ? "m" : "n";
      continue;
    }

    // Every other Devanagari codepoint is a vowel, a matra, a virama or
    // punctuation - all dropped.
    if (char >= "ऀ" && char <= "ॿ") continue;

    // ---- Latin ----
    const lower = char.toLowerCase();
    if (lower < "a" || lower > "z") continue;
    if (VOWELS_LATIN.has(lower)) continue;

    if (lower === "c") {
      // "ch" stays "ch"; a lone c is a k.
      const next = (text[i + 1] || "").toLowerCase();
      if (next === "h") {
        out += "ch";
        i++; // the h has been consumed
      } else {
        out += "k";
      }
      continue;
    }

    out += LATIN_FOLDING[lower] || lower;
  }

  // Collapse doubled letters. Latin spellings double consonants far
  // more freely than Devanagari does - Cuttack against कटक, Mumbai
  // against मुंबई - and squeezing runs down to one letter makes the
  // two sides line up.
  return out.replace(/(.)\1+/g, "$1");
}

/**
 * Does a spoken place refer to this government record?
 *
 * The record's market, district and state are each checked as separate
 * words, rather than glued into one string - "Indore" must match the
 * word "Indore", not happen to fall across the join between two other
 * names.
 *
 * @param {string} spokenPlace - what the farmer said, any script
 * @param {string[]} candidateNames - e.g. [market, district, state]
 * @returns {boolean}
 */
function placeMatches(spokenPlace, candidateNames) {
  const wanted = String(spokenPlace || "").trim();
  if (!wanted) return false;

  // Try the plain text first. When both sides are already Latin this is
  // exactly the old behaviour, so nothing that worked before changes.
  const wantedLower = wanted.toLowerCase();
  for (const name of candidateNames) {
    if (name && String(name).toLowerCase().includes(wantedLower)) return true;
  }

  // Otherwise compare consonant skeletons.
  const wantedKey = consonantSkeleton(wanted);
  if (wantedKey.length < 2) return false; // too short to be safe

  for (const name of candidateNames) {
    if (!name) continue;

    // Split on spaces and punctuation so "Indore(F&V)" still offers
    // "Indore" as a word of its own.
    const words = String(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

    for (const word of words) {
      const wordKey = consonantSkeleton(word);
      if (!wordKey) continue;

      // Short skeletons must match the whole word. Letting "pn" match
      // inside a longer name would pull in half the country.
      if (wantedKey.length < 3) {
        if (wordKey === wantedKey) return true;
      } else if (wordKey.includes(wantedKey) || wantedKey.includes(wordKey)) {
        return true;
      }
    }
  }

  return false;
}

module.exports = { consonantSkeleton, placeMatches };
