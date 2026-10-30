// components/ScopeComparisonCards.jsx
// -----------------------------------------------------------------------
// The three price-comparison cards on Check Rates:
//
//   1. Near You    - only mandis inside the chosen radius
//   2. State Level - every mandi in the farmer's state
//   3. National    - every mandi in the country
//
// Each shows the dearest and cheapest mandi in that scope, how far each
// one is, and the gap between them.
//
// ---------------------------------------------------------------------
// WHY THREE SCOPES INSTEAD OF ONE
// ---------------------------------------------------------------------
// The page used to show a single national pair. "The best price in
// India is Rs 7,000" is true and almost useless if that mandi is 1,975
// km away - a farmer cannot drive there. The three scopes turn one
// unusable fact into a decision: what can I get nearby, what could I
// get if I crossed the state, and what is the ceiling anywhere.
//
// ---------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------
// Stacked on phones, three across from `lg` up. Three of these side by
// side at phone width would be about 120px each - too narrow for a
// mandi name, a price and a distance.
//
// All the numbers come from the BACKEND (`scopes` on the compare
// response). Distances need the district coordinate table and the
// fuzzy district matching in locationService.js, so computing them
// here would mean shipping and duplicating both.
// -----------------------------------------------------------------------

import { useState } from "react";

import { useLanguage } from "../context/LanguageContext";
import {
  ICON_MD,
  ICON_LG,
  ICON_STROKE,
  ChartIcon,
  CountryIcon,
  LocationIcon,
  OkIcon,
  RegionIcon,
  TipIcon,
} from "./icons";

/** ₹12,345 - Indian digit grouping. */
function rupees(value) {
  if (value == null) return "-";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

/**
 * How a distance reads on screen.
 *
 * Mirrors the Near Me page on purpose: below ~12 km we only know the
 * district, so an exact figure would be falsely precise - every mandi
 * in one district shares a single point on the map.
 */
function DistanceLabel({ mandi }) {
  const { t } = useLanguage();

  if (!mandi || mandi.distanceKm == null) return null;

  if (mandi.distanceAccuracy === "state") {
    return (
      <span className="text-xs text-warning-600">
        ~{Math.round(mandi.distanceKm)} km · {t("nm_rough_estimate")}
      </span>
    );
  }

  if (mandi.distanceKm < 12) {
    return <span className="text-xs text-primary-700">{t("nm_in_your_area")}</span>;
  }

  return (
    <span className="text-xs text-ink-500">{t("nm_km_away", { km: Math.round(mandi.distanceKm) })}
    </span>
  );
}

// One side of a card: the dearest or the cheapest mandi.
function ScopeSide({ mandi, tone }) {
  const { t } = useLanguage();

  const isGood = tone === "good";
  const label = isGood ? t("scope_highest") : t("scope_lowest");
  const priceColour = isGood ? "text-positive-700" : "text-negative-600";
  const chip = isGood ? "bg-positive-50 text-positive-700" : "bg-negative-50 text-negative-600";

  if (!mandi) {
    return (
      <div className="flex-1 min-w-0">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${chip}`}>{label}
        </span>
        <p className="text-ink-400 text-sm mt-2">—</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${chip}`}>{label}
      </span>

      <p className={`text-2xl font-semibold leading-tight mt-1.5 ${priceColour}`}>{rupees(mandi.price)}
      </p>

      <p className="text-sm font-medium text-ink-900 truncate" title={mandi.mandiName}>{mandi.mandiName}
      </p>
      {/* District for the state card, state for the others - whichever
          actually tells you where this is, given what the card is
          already scoped to. */}
      <p className="text-xs text-ink-500 truncate">{mandi.district || mandi.state}</p>

      <DistanceLabel mandi={mandi} />
    </div>
  );
}

/**
 * One scope card.
 *
 * `scope` is the object the backend returns; `state` decides which of
 * the four states it renders: loading, no-location, empty, or filled.
 */
function ScopeCard({ titleKey, subtitle, icon: Icon, scope, isLoading, blockedHintKey, emptyHintKey }) {
  const { t } = useLanguage();

  return (
    <div className="bg-card rounded-lg shadow-soft border border-surface-300/60 p-5 flex flex-col">
      <div className="mb-3">
        <h3 className="flex items-center gap-1.5 font-medium text-ink-900 text-sm">
          {Icon && <Icon size={ICON_MD} strokeWidth={ICON_STROKE} className="text-ink-400 shrink-0" aria-hidden="true" />}
          {t(titleKey)}
        </h3>
      {/* The scope, spelled out. Three cards that look alike need a
            one-line answer to "which one am I reading?". */}
        <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>
      </div>
      {/* ---- 1. Loading: each card independently ---- */}
      {isLoading ? (
        <div className="animate-pulse flex gap-4 flex-1">{[0, 1].map((i) => (
            <div key={i} className="flex-1">
              <div className="h-3 w-16 bg-surface-200 rounded mb-3" />
              <div className="h-6 w-24 bg-surface-200 rounded mb-2" />
              <div className="h-3 w-full bg-surface-200 rounded mb-1" />
              <div className="h-3 w-20 bg-surface-200 rounded" />
            </div>
          ))}
        </div>
      ) : blockedHintKey ? (
        /* ---- 2. This card cannot be built yet ----
           No button here on purpose. Asking for location inside every
           card that needs it meant the farmer was prompted twice for
           the same permission - once by Near You and once by State
           Level. The single ask now lives in the section header, and
           each card just says what it is waiting for. */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <p className="text-sm text-ink-500">{t(blockedHintKey)}</p>
        </div>
      ) : !scope || scope.mandiCount === 0 ? (
        /* ---- 3. Nothing in this scope ---- */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <p className="text-sm text-ink-500">{t(emptyHintKey || "scope_empty")}</p>
        </div>
      ) : (
        /* ---- 4. The comparison ---- */
        <>
          <div className="flex gap-4 flex-1">
            <ScopeSide mandi={scope.highest} tone="good" />
            <div className="w-px bg-surface-200 shrink-0" />
            <ScopeSide mandi={scope.lowest} tone="bad" />
          </div>
      {/* The gap, in the same voice as the existing insight line. */}
          {scope.priceGap > 0 && (
            <p className="text-xs text-warning-900 bg-warning-50 border border-warning-200 rounded-md px-3 py-2 mt-3">
              <TipIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("scope_gap", {
                gap: Math.round(scope.priceGap).toLocaleString("en-IN"),
                percent: scope.priceGapPercent,
              })}
            </p>
          )}

          <p className="text-[11px] text-ink-400 mt-2">{t("scope_mandi_count", { count: scope.mandiCount })}
          </p>
        </>
      )}
    </div>
  );
}

// The presets offered in the dropdown.
//
// It used to stop at 100 km, which is short for this: on a thin day the
// nearest reporting mandi can be 300 km away, and the farmer could see
// nothing at all with no way to widen the search. "Custom" is there for
// anything in between or beyond.
const RADIUS_PRESETS = [10, 25, 50, 100, 150, 200, 300, 500];

function ScopeComparisonCards({ scopes, isLoading, radiusKm, onRadiusChange, onUseLocation, hasLocation }) {
  const { t } = useLanguage();

  // Whether the dropdown is on "Custom". Starts on if the radius we
  // were given is not one of the presets - e.g. restored from a
  // previous search - so the box does not silently snap to 50.
  const [isCustomRadius, setIsCustomRadius] = useState(
    !RADIUS_PRESETS.includes(radiusKm)
  );
  const [customValue, setCustomValue] = useState(String(radiusKm));

  // Nothing to show before the first search.
  if (!scopes && !isLoading) return null;

  function handlePresetChange(value) {
    if (value === "custom") {
      setIsCustomRadius(true);
      setCustomValue(String(radiusKm));
      return; // wait for a number before searching again
    }

    setIsCustomRadius(false);
    onRadiusChange(Number(value));
  }

  function applyCustom() {
    const km = Number(customValue);

    // Clamped to the same 1-500 the backend enforces, so the box cannot
    // promise a search the server will quietly narrow.
    if (!Number.isFinite(km) || km < 1) return;
    onRadiusChange(Math.min(Math.max(Math.round(km), 1), 500));
  }

  const nearYou = scopes?.nearYou;
  const state = scopes?.state;
  const national = scopes?.national;

  const stateName = state?.stateName;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-medium text-ink-900"><ChartIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("scope_section_title")}</h2>

        <div className="flex flex-wrap items-center gap-3">
      {/* ---- ONE location ask for the whole section ---- */}
          {/* Both Near You and State Level need this. Asking inside each
              card meant two prompts for one permission. */}
          {hasLocation ? (
            <span className="text-sm text-positive-700"><OkIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("scope_location_on")}</span>
          ) : (
            <button
              type="button"
          onClick={onUseLocation}
              className="px-4 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90">
              <LocationIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("nm_use_my_location")}
            </button>
          )}

          {/* ---- Radius ---- */}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-500">{t("nm_search_within")}</span>
            <select
              value={isCustomRadius ? "custom" : radiusKm}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="border border-ink-200 rounded-md px-2.5 py-1.5 bg-card text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500">
              {/* The default: no distance cap, so the "Near You" card
                  shows a nearest mandi even when it is further away
                  than any preset. */}
              <option value="">{t("nm_any_distance")}</option>

              {RADIUS_PRESETS.map((km) => (
                <option key={km} value={km}>{km} km
                </option>
              ))}
              <option value="custom">{t("scope_radius_custom")}</option>
            </select>
          </label>{isCustomRadius && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
          min={1}
                max={500}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                // Enter applies it, so the farmer does not have to find
                // the button.
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCustom();
                  }
                }}
                placeholder={t("scope_radius_custom_placeholder")}
                className="w-24 border border-ink-200 rounded-md px-2.5 py-1.5 bg-card text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500"/>
              <span className="text-sm text-ink-500">km</span>
              <button
                type="button"
          onClick={applyCustom}
                className="px-3 py-1.5 rounded-md bg-primary-600 text-primary-foreground text-sm font-medium hover:opacity-90">{t("common_search")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ScopeCard
          titleKey="scope_near_you"
          subtitle={
            scopes?.nearYou?.radiusFilterEmpty
              ? t("nm_radius_empty", { radius: scopes.nearYou.radiusKm })
              : radiusKm == null
              ? t("nm_any_distance")
              : t("scope_near_you_sub", { radius: radiusKm })
          }
          icon={LocationIcon}
          scope={nearYou}
          isLoading={isLoading}
          // A radius search genuinely cannot be done without a point to
          // measure from.
          blockedHintKey={!hasLocation ? "scope_blocked_near" : null}
          emptyHintKey="scope_empty_radius"/>

        <ScopeCard
          titleKey="scope_state"
          subtitle={
            stateName
              ? t("scope_state_sub", { state: stateName })
              : t("scope_state_sub_unknown")
          }
          icon={RegionIcon}
          scope={state}
          isLoading={isLoading}
          // TWO ways to fill this card, and the message says both. It
          // used to show the same "share your location" prompt as Near
          // You, which hid the fact that simply typing a state in the
          // box above works - and made the card look broken rather than
          // unconfigured.
          blockedHintKey={!stateName ? "scope_blocked_state" : null}
          emptyHintKey="scope_empty_state"/>

        <ScopeCard
          titleKey="scope_national"
          subtitle={t("scope_national_sub")}
          icon={CountryIcon}
          scope={national}
          isLoading={isLoading}
          // National never needs a location. Distances on its two
          // mandis appear anyway once location is shared, because the
          // backend attaches them to every row it can place.
          blockedHintKey={null}
          emptyHintKey="scope_empty"/>
      </div>
    </div>
  );
}

export default ScopeComparisonCards;
