// components/CropTicker.jsx
// -----------------------------------------------------------------------
// An endlessly scrolling row of crop cards, like a stock-market ticker.
// Each card links straight to that crop's live rates.
//
// ---------------------------------------------------------------------
// HOW THE ENDLESS SCROLL WORKS (the one clever bit)
// ---------------------------------------------------------------------
// The trick is that we render the SAME list of crops TWICE, one after
// the other, and then slide the whole strip left by exactly 50%.
//
//   [wheat onion rice ...][wheat onion rice ...]
//    ^-- start                ^-- exactly 50% across
//
// At the halfway point the screen looks pixel-for-pixel identical to
// the start, so when the animation loops back to 0% nobody can see the
// jump. That's the entire illusion - see `@keyframes marquee` in
// index.css, which moves it to -50% and no further.
//
// WHY EMOJI AND NOT PHOTOGRAPHS?
// We'd need a correctly-labelled photo of every single crop. A stock
// photo library will happily hand you a tomato when you ask for
// "wheat", and a card that says "Wheat" over a picture of tomatoes is
// worse than no picture at all. Emoji are always right, load instantly,
// and work offline.
// -----------------------------------------------------------------------

import { Link } from "react-router-dom";

// The crops the ticker cycles through. `name` is passed
// straight to the Check Rates page as a search term, so it must match a
// crop name the government dataset actually uses.
const crops = [
  { name: "Wheat"},
  { name: "Onion"},
  { name: "Tomato"},
  { name: "Potato"},
  { name: "Rice"},
  { name: "Cotton"},
  { name: "Maize"},
  { name: "Chilli"},
  { name: "Banana"},
  { name: "Mango"},
  { name: "Garlic"},
  { name: "Grapes"},
  { name: "Coconut"},
  { name: "Soyabean"},
];

function CropTicker({ t }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-ink-900">{t("crops_title")}</h2>
        <p className="text-ink-500">{t("crops_subtitle")}</p>
      </div>

      {/* The mask fades the strip out at both edges, so cards appear to
          drift in and out of view instead of being cut off by a hard line. */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <div className="flex gap-4 w-max animate-marquee">
          {/* The list, rendered twice - see the note at the top. The
              second copy is hidden from screen readers so they don't
              announce all fourteen crops a second time. */}
          {[...crops, ...crops].map((crop, index) => (
            <CropCard
              key={`${crop.name}-${index}`}
              crop={crop}
              isDuplicate={index >= crops.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// One crop card. Clicking it opens Check Rates already searching for
// that crop, so the ticker is genuinely useful rather than decoration.
function CropCard({ crop, isDuplicate }) {
  return (
    <Link
      to={`/check-rates?crop=${encodeURIComponent(crop.name)}`}
      aria-hidden={isDuplicate}
      tabIndex={isDuplicate ? -1 : 0}
      className={`shrink-0 w-36 rounded-lg  border border-white/60 shadow-sm p-5 text-center hover-lift`}
    >
      <p className={`font-medium `}>{crop.name}</p>
      <p className="text-[11px] text-ink-600/80 mt-1">View rates →</p>
    </Link>
  );
}

export default CropTicker;
