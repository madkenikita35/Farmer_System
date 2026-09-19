// pages/NearbyMandis.jsx
// -----------------------------------------------------------------------
// "Which mandi NEAR ME is paying the most for my crop?"
//
// Check Rates already shows the best-paying mandi anywhere in India. But
// a mandi 900 km away paying ₹300 more is no use to anybody. This page
// adds the half that was missing: distance.
//
// The farmer gives their location in one of FIVE ways - GPS, a town
// name, a pincode, a structured address, or typed coordinates. All of
// them resolve to a single lat/lon before this page does anything with
// it; see components/LocationPicker.jsx.
//
// ---------------------------------------------------------------------
// A NOTE ON THE BROWSER'S LOCATION PERMISSION
// ---------------------------------------------------------------------
// navigator.geolocation only works when the page is served over HTTPS -
// or over http://localhost, which is why it works while you're
// developing. If you put this app on a plain http:// address the button
// will silently fail, and the typed-place box is the way in. The page
// handles a refused or unavailable location by saying so and falling
// back to typing, rather than just doing nothing.
// -----------------------------------------------------------------------

import { useState, useMemo } from "react";
import { getNearbyMandis } from "../api/api";
import StatCard from "../components/StatCard";
import CropSelect from "../components/CropSelect";
import LocationPicker from "../components/LocationPicker";
import BuySellScopeCards from "../components/BuySellScopeCards";
import DataFreshness from "../components/DataFreshness";
import { useLanguage } from "../context/LanguageContext";
import {
  ICON_MD,
  ICON_LG,
  ICON_STROKE,
  FarmersIcon,
  LocationIcon,
  MandiIcon,
  RupeeIcon,
  TipIcon,
  SellIcon,
  BuyIcon,
} from "../components/icons";

function NearbyMandis() {
  const { t } = useLanguage();

  const [crop, setCrop] = useState("");
  const [radius, setRadius] = useState(150);

  // "sell" (the default) or "buy". A farmer selling wants the highest
  // price; a trader buying wants the lowest. It changes which two
  // mandis every card shows, at all three scopes.
  const [mode, setMode] = useState("sell");
  const [sortBy, setSortBy] = useState("price");

  // Coordinates, however the farmer gave them to us. Everything
  // downstream - the search, the distances - uses only this.
  const [coordinates, setCoordinates] = useState(null);

  // The fuller answer from the resolver: the label to show, which
  // method produced it, and how precise it is. Kept separate so the
  // search path stays a plain lat/lon.
  const [resolvedLocation, setResolvedLocation] = useState(null);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // The GPS call, the pincode lookup and the address lookup all now
  // live in LocationPicker - this page only receives the result.

  // `overrides` lets the mode toggle re-run the search immediately:
  // setMode is async, so reading `mode` right after setting it would
  // still give the old value.
  async function handleSearch(e, overrides = {}) {
    if (e && e.preventDefault) e.preventDefault();

    if (!crop.trim()) {
      setErrorMessage(t("nm_err_choose_crop"));
      return;
    }
    if (!coordinates) {
      setErrorMessage(t("nm_err_need_place"));
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await getNearbyMandis({
        mode: overrides.mode || mode,
        crop: crop.trim(),
        // Send coordinates if we have them, otherwise the typed name.
        lat: coordinates.lat,
        lon: coordinates.lon,
        radius,
        sortBy,
      });
      setResult(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.response?.data?.message || t("nm_err_search"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-semibold text-ink-900 mb-2"><LocationIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("nm_title")}</h1>
      <p className="text-ink-600 mb-6">{t("nm_subtitle")}</p>

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 mb-8"
      >
        {/* ---- Am I buying or selling? ---- */}
        {/* First, because it changes the meaning of every number below
            it. Same pill style as the other toggles on the site. */}
        <div className="mb-4">
          <p className="text-sm font-medium text-ink-600 mb-2">{t("bs_i_want_to")}</p>
          <div className="flex gap-2">
            {[
              { key: "sell", labelKey: "bs_sell", icon: SellIcon },
              { key: "buy", labelKey: "bs_buy", icon: BuyIcon },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setMode(option.key);
                  // Re-run at once if there is already a result on
                  // screen - otherwise the cards would contradict the
                  // toggle until the farmer pressed search again.
                  if (crop.trim() && coordinates && result) {
                    handleSearch(null, { mode: option.key });
                  }
                }}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                  mode === option.key
                    ? "bg-primary-600 text-primary-foreground border-transparent shadow-soft scale-[1.03]"
                    : "bg-card text-ink-600 border-surface-300 hover:border-ink-300 hover:bg-surface-100"
                }`}
              >
                {option.icon && <option.icon size={ICON_MD} strokeWidth={ICON_STROKE} className="inline-block mr-1.5 align-[-2px]" aria-hidden="true" />}
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="nearby-crop"
              className="block text-sm font-medium text-ink-600 mb-1"
            >
              {t("common_crop")}
            </label>
            {/* A dropdown, not a text box. The crop name is matched
                against the government feed almost exactly, so a typo -
                or the feed's own spelling, like "Bhindi(Ladies Finger)"
                for okra - came back as "no prices found" and read as
                "there is no data". You cannot mistype a list. */}
            <CropSelect
              id="nearby-crop"
              value={crop}
              onChange={setCrop}
              className="w-full border border-ink-200 rounded-md px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("nm_search_within")}
            </label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border border-ink-200 rounded-md px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={150}>150 km</option>
              <option value={250}>250 km</option>
              <option value={500}>500 km</option>
            </select>
          </div>
        </div>

        {/* ---- Where are you? Five ways to answer ---- */}
        {/* All of them resolve to one lat/lon before anything else
            happens, so the radius search and the distances below never
            learn which method was used. See LocationPicker.jsx. */}
        <LocationPicker
          resolved={resolvedLocation}
          onResolved={(next) => {
            setResolvedLocation(next);
            setCoordinates({ lat: next.lat, lon: next.lon });
            setErrorMessage("");
          }}
          onError={(message) => setErrorMessage(message)}
        />

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary-gradient text-primary-foreground font-medium px-6 py-3 rounded-lg shadow-soft hover:scale-[1.02] transition-all disabled:opacity-50 hover-lift"
          >
            {isLoading ? t("common_searching") : `${t("nm_find_btn")}`}
          </button>

        </div>
      </form>

      {errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-md px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---- The three scopes, buy or sell ---- */}
      {(result || isLoading) && (
        <BuySellScopeCards
          scopes={result?.scopes}
          mode={mode}
          isLoading={isLoading}
          radiusKm={radius}
        />
      )}

      {/* The full ranked table stays below - the cards answer "where
          should I go", the table is for reading the detail. */}
      {result && (
        <NearbyResults result={result} sortBy={sortBy} onSortChange={setSortBy} />
      )}

      {result && <DataFreshness source="agmarknet" className="mt-4" />}
    </div>
  );
}

// ---------------------------------------------------------------------
// Everything shown once a search has returned. Split out so the
// component above stays focused on the FORM and this one on the RESULTS.
// ---------------------------------------------------------------------
function NearbyResults({ result, sortBy, onSortChange }) {
  const { t, tPlural } = useLanguage();

  const { mandis, bestPaying, nearest, tradeOff, origin, radiusKm } = result;

  // Re-order whenever the farmer flips the Sort by buttons.
  //
  // The backend already sorted this list once, but we sort again here so
  // the toggle works INSTANTLY instead of waiting for another search.
  //
  // Two details worth noting:
  //   - [...mandis] makes a copy first. .sort() rearranges an array in
  //     place, and mutating props is how you get bugs that only show up
  //     on a re-render.
  //   - useMemo means we only re-sort when the list or the order actually
  //     changes, not on every single render of this component.
  const sortedMandis = useMemo(() => {
    return [...mandis].sort((a, b) => {
      if (sortBy === "distance") {
        // Closest first; if two are equally close, the better price wins.
        return a.distanceKm - b.distanceKm || b.modalPrice - a.modalPrice;
      }
      // Highest price first; if two pay the same, the closer one wins.
      return b.modalPrice - a.modalPrice || a.distanceKm - b.distanceKm;
    });
  }, [mandis, sortBy]);

  if (mandis.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-lg border border-border">
        <p className="font-medium text-ink-900 mb-1">
          {t("nm_none_title", { radius: radiusKm })}
        </p>
        <p className="text-sm text-ink-500 max-w-md mx-auto">
          {result.outsideRadius > 0
            ? t("nm_none_outside", { count: result.outsideRadius, radius: radiusKm })
            : t("nm_none_text")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ---- The headline answer ---- */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <HighlightCard
          title={t("nm_best_price_near")}
          emoji={RupeeIcon}
          mandi={bestPaying}
          tone="good"
        />
        <HighlightCard title={t("nm_closest_to_you")} emoji={LocationIcon} mandi={nearest} tone="neutral" />
      </div>

      {/* ---- The trade-off, worked out for them ---- */}
      {tradeOff && tradeOff.extraRupeesPerQuintal > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-md px-5 py-4 mb-6 text-sm text-warning-900">
          <TipIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" />{" "}
          {t("nm_tradeoff", {
            extra: tradeOff.extraRupeesPerQuintal.toLocaleString("en-IN"),
            km: tradeOff.extraKm,
            total: (tradeOff.extraRupeesPerQuintal * 10).toLocaleString("en-IN"),
          })}
        </div>
      )}

      {/* ---- Where we searched from ---- */}
      {/* One quiet line. This is a caption on the results, not a result:
          three tall cards to say "23 mandis, within 150 km, around Pune"
          was pushing the ranked list itself off a phone screen. */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 px-4 py-3
          rounded-md bg-surface-200/60 text-sm text-ink-600"
      >
        <span className="flex items-center gap-1.5">
           <strong className="font-medium text-ink-900">{result.totalFound}</strong>
          {t("nm_mandis_found")}
        </span>
        <span className="flex items-center gap-1.5">
           <strong className="font-medium text-ink-900">{radiusKm} km</strong>
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
           <span className="truncate">{shortLabel(origin.label)}</span>
        </span>
      </div>

      {/* ---- The full ranked list ---- */}
      {/* The Sort by control lives HERE, right on top of the table it
          reorders - not up in the search form where it used to be.

          Up there it looked broken: the two big summary cards sit between
          the buttons and the table, so clicking "Nearest" changed nothing
          you could actually see. (Those cards answer "best price" and
          "closest" and are the same whichever order the list is in, by
          design.) Next to the table, the effect of a click is immediate
          and obvious. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-medium text-ink-900">
          {t("nm_all_within", { count: result.totalFound, radius: radiusKm })}
        </h2>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-500">{t("nm_sort_by")}</span>
          <button
            type="button"
            onClick={() => onSortChange("price")}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              sortBy === "price"
                ? "bg-primary-600 text-primary-foreground shadow-sm"
                : "bg-muted text-ink-600 hover:bg-border"
            }`}
          >
            <RupeeIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("nm_sort_price")}
          </button>
          <button
            type="button"
            onClick={() => onSortChange("distance")}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              sortBy === "distance"
                ? "bg-primary-600 text-primary-foreground shadow-sm"
                : "bg-muted text-ink-600 hover:bg-border"
            }`}
          >
            <LocationIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("nm_sort_distance")}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-soft border border-surface-300/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-200/70 text-ink-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">{t("common_mandi")}</th>
                {/* A ▼ on whichever column the list is currently ordered
                    by, so the sort state is readable from the table
                    itself and not only from the buttons above it. */}
                <th
                  className={`text-right px-4 py-3 font-medium ${
                    sortBy === "distance" ? "text-primary-700" : ""
                  }`}
                >
                  {t("nm_col_distance")}
                  {sortBy === "distance" ? " ▼" : ""}
                </th>
                <th
                  className={`text-right px-4 py-3 font-medium ${
                    sortBy === "price" ? "text-primary-700" : ""
                  }`}
                >
                  <MandiIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("common_government")}
                  {sortBy === "price" ? " ▼" : ""}
                  <span className="block text-[11px] font-normal text-ink-400">
                    {t("common_per_quintal")}
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  <FarmersIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("common_our_farmers")}
                  <span className="block text-[11px] font-normal text-ink-400">
                    {t("common_per_quintal")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMandis.map((mandi, index) => (
                <tr
                  key={`${mandi.mandiName}-${mandi.state}-${index}`}
                  className={`border-t border-surface-200 hover:bg-primary-50/40 ${
                    index === 0 ? "bg-positive-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-ink-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink-900">{mandi.mandiName}</span>
                    <span className="block text-xs text-ink-400">
                      {mandi.district ? `${mandi.district}, ` : ""}
                      {mandi.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DistanceLabel mandi={mandi} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-primary-700">
                    ₹{mandi.modalPrice.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {mandi.farmerReportedPrice ? (
                      <>
                        <span className="font-medium text-warning-600">
                          ₹{mandi.farmerReportedPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-[11px] text-ink-400">
                          {tPlural("report_count", mandi.farmerReportCount)}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-400 mt-4">
        {t("nm_footnote")}
        {result.couldNotLocate > 0 &&
          ` ${t("nm_footnote_unlocated", { count: result.couldNotLocate })}`}
        {result.dataSource === "mock" && `  ${t("nm_footnote_mock")}`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// How a distance is written on screen.
//
// WHY THIS ISN'T JUST `{mandi.distanceKm} km`
// We know where each mandi's DISTRICT is, not the mandi itself. So every
// mandi in one district shares a single point on the map - which means
// five different Ludhiana mandis all came out as "0 km", as if they were
// the same place. They are really 20-40 km apart.
//
// Printing "0 km" five times looks broken and, worse, tells the farmer
// something untrue. So anything inside the width of a district is shown
// as "in your area" instead of a falsely precise number. The ordering
// still uses the real figure - this only changes what is DISPLAYED.
// ---------------------------------------------------------------------
function DistanceLabel({ mandi }) {
  const { t } = useLanguage();

  // Roughly how wide an Indian district is, so distances below this are
  // inside our margin of error rather than genuinely measured.
  const DISTRICT_PRECISION_KM = 12;

  if (mandi.distanceAccuracy === "state") {
    // We only knew the state, so this could be a couple of hundred km out.
    return (
      <>
        <span className="font-medium">~{Math.round(mandi.distanceKm)} km</span>
        <span className="block text-[11px] text-warning-600">{t("nm_rough_estimate")}</span>
      </>
    );
  }

  if (mandi.distanceKm < DISTRICT_PRECISION_KM) {
    return (
      <>
        <span className="font-medium text-primary-700">{t("nm_in_your_area")}</span>
        <span className="block text-[11px] text-ink-400">{t("nm_same_district")}</span>
      </>
    );
  }

  return <span className="font-medium">{Math.round(mandi.distanceKm)} km</span>;
}

// One of the two big answer cards at the top.
function HighlightCard({ title, emoji: Icon, mandi, tone }) {
  const { t } = useLanguage();

  if (!mandi) return null;

  const styles =
    tone === "good"
      ? "bg-positive-50 border-positive-200 text-positive-900"
      : "bg-info-50 border-info-200 text-info-900";

  return (
    <div className={`rounded-lg border px-5 py-4 ${tone === "good" ? styles : styles} hover-lift`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
        {Icon && <Icon size={ICON_MD} strokeWidth={ICON_STROKE} className="inline-block mr-1.5 align-[-2px]" aria-hidden="true" />}
        {title}
      </p>
      <p className="text-lg font-semibold leading-tight">{mandi.mandiName}</p>
      <p className="text-sm opacity-70 mb-2">
        {mandi.district ? `${mandi.district}, ` : ""}
        {mandi.state}
      </p>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold">
          ₹{mandi.modalPrice.toLocaleString("en-IN")}
        </span>
        <span className="text-sm opacity-70">
          {mandi.distanceAccuracy === "state"
            ? t("nm_km_away_rough", { km: Math.round(mandi.distanceKm) })
            : mandi.distanceKm < 12
            ? t("nm_in_your_area_lower")
            : t("nm_km_away", { km: Math.round(mandi.distanceKm) })}
        </span>
      </div>
    </div>
  );
}

/**
 * OpenStreetMap returns very long labels ("Nashik, Nashik Taluka, Nashik
 * Division, Maharashtra, 422001, India"). The stat card has room for
 * about two parts of that, so we keep the first two.
 */
function shortLabel(label) {
  if (!label) return "-";
  return label.split(",").slice(0, 2).join(",").trim();
}

export default NearbyMandis;
