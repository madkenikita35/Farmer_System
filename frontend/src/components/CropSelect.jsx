// components/CropSelect.jsx
// -----------------------------------------------------------------------
// A dropdown of every crop the government feed is carrying today.
//
// ---------------------------------------------------------------------
// WHY THIS REPLACED A TEXT BOX
// ---------------------------------------------------------------------
// The crop name typed here is matched against the government feed, and
// the match has to be close to exact. So "Tomatoe", "onoin", or the
// perfectly reasonable "Lady Finger" (the feed calls it
// "Bhindi(Ladies Finger)") all came back as "no prices found" - which
// reads as "there is no data" when it really means "that is not how
// this dataset spells it".
//
// A dropdown removes the whole class of problem: you cannot mistype
// something you pick from a list.
//
// ---------------------------------------------------------------------
// WHY THE OPTIONS ARE GROUPED
// ---------------------------------------------------------------------
// There are ~206 crops. A flat list that long is a scroll nobody wants.
// <optgroup> splits them into Vegetables, Fruits, Cereals and so on -
// the same categories used by the charts, so the grouping is one idea
// learned once.
//
// Native <select> is deliberate rather than a custom combobox:
//   - on a phone it opens the OS picker, which is familiar and big
//     enough to tap accurately
//   - it supports type-ahead for free (press "o" to jump to Onion)
//   - it works without JavaScript styling tricks, and with screen
//     readers, at no cost
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";

import { getMandiCropNames } from "../api/api";
import { useLanguage } from "../context/LanguageContext";
import { CATEGORY_ORDER, CATEGORY_LABEL_KEYS } from "./chartTheme";

// The app's standard input styling. It lives here as the DEFAULT rather
// than being passed in by every caller, because a caller who forgets it
// gets an unstyled browser <select> that looks broken next to the boxes
// beside it - and nothing warns you.
const DEFAULT_CLASS =
  "w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 " +
  "focus:border-primary-500 transition-all disabled:opacity-60";

function CropSelect({ value, onChange, className = DEFAULT_CLASS, id }) {
  const { t } = useLanguage();

  const [crops, setCrops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await getMandiCropNames();
        if (cancelled) return;
        setCrops(response.data.crops || []);
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load the crop list:", error);
        setFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the list cannot be loaded, fall back to a text box rather than
  // leaving an empty dropdown. A typo-prone input still lets someone
  // search; a dead <select> does not.
  if (failed) {
    return (
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("nm_placeholder_crop")}
        className={className}
      />
    );
  }

  // Bucket by category, keeping the app-wide order.
  const grouped = {};
  for (const crop of crops) {
    const category = crop.category || "other";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(crop);
  }

  const categoriesPresent = CATEGORY_ORDER.filter(
    (category) => grouped[category] && grouped[category].length > 0
  );

  // A crop can arrive from the URL - /check-rates?crop=Onion, which is
  // how the Mandi pages link here - and the feed does not always carry
  // it today. Without an option to match, the <select> would show the
  // placeholder while the search still ran on the URL's crop: the box
  // would say one thing and the results another. So the current value
  // always gets an option, even if it is not in the list.
  const isValueMissing =
    value && !crops.some((crop) => crop.name === value);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      className={className}
    >
      <option value="">
        {isLoading ? t("crop_select_loading") : t("crop_select_placeholder")}
      </option>

      {isValueMissing && <option value={value}>{value}</option>}

      {categoriesPresent.map((category) => (
        <optgroup key={category} label={t(CATEGORY_LABEL_KEYS[category])}>
          {grouped[category].map((crop) => (
            <option key={crop.name} value={crop.name}>
              {crop.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export default CropSelect;
