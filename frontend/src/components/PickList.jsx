// components/PickList.jsx
// -----------------------------------------------------------------------
// A dropdown used wherever the app used to have a search TEXT BOX.
//
// ---------------------------------------------------------------------
// WHY TYPING WAS THE PROBLEM
// ---------------------------------------------------------------------
// Every one of these boxes was matched against a fixed list that came
// from the government feed - crop names, mandi names, state names. The
// match has to be close to exact, so "Tomatoe", "onoin", "Ratnagri" or
// the perfectly reasonable "Lady Finger" all came back as "no results".
//
// That reads as "there is no data", when it really means "that is not
// how this dataset spells it". The farmer has no way to tell the two
// apart, and no way to guess the spelling the feed wants.
//
// You cannot mistype something you pick from a list. This is the same
// reasoning that put a dropdown on the Near Me crop box - see
// CropSelect.jsx, which is the crop-specific version of this.
//
// ---------------------------------------------------------------------
// WHY A NATIVE <select> AND NOT A FANCY COMBOBOX
// ---------------------------------------------------------------------
//   - on a phone it opens the operating system's own picker, which is
//     big, familiar, and easy to hit accurately with a thumb
//   - type-ahead comes free: press "o" to jump to Onion, and keep
//     typing to narrow it. So picking from a long list is still fast
//     for anyone who WANTS to type
//   - it works with screen readers and the keyboard at no extra cost
//   - there is no dropdown panel to position, close, or trap focus in
//
// A custom combobox would need all of that written by hand, and would
// be worse at every one of them.
//
// ---------------------------------------------------------------------
// USAGE
// ---------------------------------------------------------------------
//   Flat list:
//     <PickList value={state} onChange={setState}
//               options={["Maharashtra", "Punjab"]}
//               placeholder="All states" />
//
//   Grouped (an <optgroup> per key), for long lists:
//     <PickList value={mandi} onChange={setMandi}
//               groups={{ Maharashtra: ["Pune", "Nashik"] }}
//               placeholder="All mandis" />
// -----------------------------------------------------------------------

import { useLanguage } from "../context/LanguageContext";

function PickList({
  value,
  onChange,
  options = null,
  groups = null,
  placeholder,
  isLoading = false,
  disabled = false,
  id,
  className = "",
}) {
  const { t } = useLanguage();

  // Nothing to pick from yet, so say which - "empty" and "still
  // loading" look identical otherwise, and one of them is worth waiting
  // for while the other is not.
  const isEmpty =
    !isLoading &&
    (options ? options.length === 0 : Object.keys(groups || {}).length === 0);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || isLoading || isEmpty}
      className={`w-full border border-ink-200 rounded-md px-3.5 py-2.5 bg-card
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
        transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {/* The empty option is what "no filter" means, so it has a real
          label rather than being a blank line. */}
      <option value="">
        {isLoading ? t("common_loading") : placeholder}
      </option>

      {options &&
        options.map((option) => {
          // Accepts either plain strings or {value, label} objects, so
          // callers with a list of names do not have to map it first.
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}

      {groups &&
        Object.entries(groups).map(([groupLabel, groupOptions]) => (
          <optgroup key={groupLabel} label={groupLabel}>
            {groupOptions.map((option) => {
              const optionValue = typeof option === "string" ? option : option.value;
              const optionLabel = typeof option === "string" ? option : option.label;

              return (
                <option key={`${groupLabel}-${optionValue}`} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </optgroup>
        ))}
    </select>
  );
}

export default PickList;
