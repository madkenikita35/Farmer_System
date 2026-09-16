// services/fuzzyMatch.js
// -----------------------------------------------------------------------
// THE SINGLE BIGGEST REASON RECEIPT SCANNING USED TO FAIL.
//
// OCR almost never reads a word perfectly off a photographed invoice.
// On a real receipt we tested, "CORIANDER" came out as "CORIANDUR" and
// "Rajasthan" came out as "Rapsthan".
//
// The old scanner looked for an EXACT match, so it found neither and
// left both fields blank. This file fixes that by matching words that
// are merely CLOSE - "CORIANDUR" is only one letter away from
// "CORIANDER", so we accept it.
//
// ---------------------------------------------------------------------
// HOW "CLOSENESS" IS MEASURED: edit distance
// ---------------------------------------------------------------------
// Edit distance (also called Levenshtein distance) counts the smallest
// number of single-letter changes needed to turn one word into another.
// Each change is an insert, a delete, or a substitution:
//
//   "cat" -> "cut"   = 1  (substitute a with u)
//   "cat" -> "cart"  = 1  (insert an r)
//   "cat" -> "dog"   = 3  (substitute all three)
//
// So a small distance means the words are probably the same word, just
// misread. We allow a bigger distance for longer words, because a
// 9-letter word has more chances to get one letter wrong - and because
// two short words being 2 edits apart ("Wheat"/"Wheel") usually means
// they're genuinely different words, not a misreading.
// -----------------------------------------------------------------------

/**
 * Counts the edit distance between two strings.
 *
 * This is a classic "dynamic programming" algorithm. Don't worry if the
 * loop looks dense - the idea is simple: we build a grid where each
 * cell answers "how many edits to turn the first i letters of A into
 * the first j letters of B?", filling it in one row at a time. Each
 * answer is built from the three neighbours we already worked out.
 *
 * We only keep TWO rows at a time (previousRow / currentRow) instead of
 * the whole grid, because that's all the next row ever needs.
 */
function editDistance(a, b) {
  a = String(a).toLowerCase();
  b = String(b).toLowerCase();

  // Quick exits that save a lot of work on obvious cases.
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Row 0: turning "" into the first j letters of b costs j inserts.
  let previousRow = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    // Turning the first i letters of a into "" costs i deletes.
    const currentRow = [i];

    for (let j = 1; j <= b.length; j++) {
      // If the letters match, this position costs nothing extra.
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;

      currentRow[j] = Math.min(
        currentRow[j - 1] + 1, // insert a letter
        previousRow[j] + 1, // delete a letter
        previousRow[j - 1] + substitutionCost // substitute (or keep) it
      );
    }

    previousRow = currentRow;
  }

  return previousRow[b.length];
}

/**
 * How many misread letters we're willing to forgive, based on how long
 * the word is.
 *
 * These thresholds are deliberately cautious. Allowing 2 edits on a
 * 5-letter word would make "Wheat" match "Wheel", which would be worse
 * than finding nothing at all - a confidently WRONG crop is more
 * misleading to a farmer than a blank field they can fill in.
 */
function maxEditsFor(word) {
  const length = word.length;
  if (length <= 4) return 0; // short words must match exactly
  if (length <= 7) return 1;
  if (length <= 10) return 2;
  return 3;
}

/**
 * Is `candidate` (a word OCR read) close enough to `target` (a word
 * from our dictionary) to count as the same word?
 */
function isCloseEnough(candidate, target) {
  const allowed = maxEditsFor(target);
  if (allowed === 0) {
    return candidate.toLowerCase() === target.toLowerCase();
  }
  return editDistance(candidate, target) <= allowed;
}

/**
 * Splits OCR text into clean, comparable words.
 *
 * We strip punctuation because OCR sprinkles it everywhere -
 * "(CORIANDUR)" and "CORIANDER." should both become "coriandur" /
 * "coriander" before we compare them.
 */
function toWords(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // punctuation -> space
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Looks through `text` for any of the names in a dictionary, allowing
 * for OCR misreadings, and returns the best match found.
 *
 * @param {string} text - the OCR text to search
 * @param {Array<{name: string, aliases: string[]}>} dictionary
 * @returns {{ name: string, matchedAs: string, distance: number } | null}
 *
 * WHY RETURN THE BEST MATCH, NOT THE FIRST ONE?
 * An invoice can mention several crop-ish words. If one of them matches
 * perfectly and another only roughly, we obviously want the perfect
 * one - so we score every candidate and keep the closest. The old code
 * returned whichever happened to be earliest in the list, which is why
 * it sometimes reported the wrong crop entirely.
 */
function findBestMatch(text, dictionary) {
  const words = toWords(text);

  // Also build two- and three-word groups, so multi-word names like
  // "Madhya Pradesh" or "Bottle Gourd" can be found.
  const phrases = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  let best = null;

  for (const entry of dictionary) {
    // Check the official name AND every alias we listed for it.
    const namesToTry = [entry.name, ...(entry.aliases || [])];

    for (const nameToTry of namesToTry) {
      // Only compare against phrases with a similar word count, so we
      // don't waste time checking "wheat" against "madhya pradesh".
      const targetWordCount = nameToTry.trim().split(/\s+/).length;

      for (const phrase of phrases) {
        if (phrase.split(" ").length !== targetWordCount) continue;

        const distance = editDistance(phrase, nameToTry);
        if (distance > maxEditsFor(nameToTry)) continue;

        // Keep this one if it's the closest match we've seen so far.
        if (!best || distance < best.distance) {
          best = { name: entry.name, matchedAs: phrase, distance };
        }
      }
    }
  }

  return best;
}

/**
 * Does `text` contain any of these keywords (allowing OCR slips)?
 * Used for short marker words like "mandi" or "weight", where we match
 * against an explicit list of known misreadings rather than trusting
 * fuzzy matching on a 5-letter word.
 */
function containsKeyword(text, keywordList) {
  const lowerText = String(text).toLowerCase();
  return keywordList.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

module.exports = {
  editDistance,
  isCloseEnough,
  findBestMatch,
  containsKeyword,
  toWords,
};
