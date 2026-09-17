// pages/NearbyMandis.jsx
// -----------------------------------------------------------------------
// "Which mandi NEAR ME is paying the most for my crop?"
//
// Check Rates already shows the best-paying mandi anywhere in India. But
// a mandi 900 km away paying ₹300 more is no use to anybody. This page
// adds the half that was missing: distance.
//
// The farmer gives their location in one of two ways:
//   1. tapping "Use my location", which asks the browser for GPS, or
//   2. typing a town or district name.
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
import { useLanguage } from "../context/LanguageContext";

function NearbyMandis() {
  const { t } = useLanguage();

  const [crop, setCrop] = useState("");
  const [place, setPlace] = useState("");
  const [radius, setRadius] = useState(150);
  const [sortBy, setSortBy] = useState("price");

  // Coordinates from the phone, once the farmer has shared them.
  const [coordinates, setCoordinates] = useState(null);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ---- Ask the browser where we are ----
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setErrorMessage(t("nm_err_no_geolocation"));
      return;
    }

    setIsLocating(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      // Success
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setPlace(""); // GPS wins, so clear any typed name to avoid confusion
        setIsLocating(false);
      },
      // Failure - tell them WHICH problem it was, so they know what to do
      (error) => {
        setIsLocating(false);
        const messages = {
          1: t("nm_err_denied"),
          2: t("nm_err_unavailable"),
          3: t("nm_err_timeout"),
        };
        setErrorMessage(messages[error.code] || t("nm_err_generic_location"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function handleSearch(e) {
    e.preventDefault();

    if (!crop.trim()) {
      setErrorMessage(t("nm_err_need_crop"));
      return;
    }
    if (!coordinates && !place.trim()) {
      setErrorMessage(t("nm_err_need_place"));
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await getNearbyMandis({
        crop: crop.trim(),
        // Send coordinates if we have them, otherwise the typed name.
        lat: coordinates?.lat,
        lon: coordinates?.lon,
        place: coordinates ? undefined : place.trim(),
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
      <h1 className="text-2xl font-bold text-ink-900 mb-2">📍 {t("nm_title")}</h1>
      <p className="text-ink-600 mb-6">{t("nm_subtitle")}</p>

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60 mb-8"
      >
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">{t("common_crop")}</label>
            <input
              type="text"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder={t("nm_placeholder_crop")}
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("nm_search_within")}
            </label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={150}>150 km</option>
              <option value={250}>250 km</option>
              <option value={500}>500 km</option>
            </select>
          </div>
        </div>

        {/* ---- Location: GPS button OR a typed name ---- */}
        <div className="border-t border-surface-200 pt-4">
          <p className="text-sm font-medium text-ink-600 mb-2">{t("nm_your_location")}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${
                coordinates
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-brand-navy text-white hover:opacity-90"
              }`}
            >
              {isLocating
                ? `📡 ${t("nm_finding_you")}`
                : coordinates
                ? `✅ ${t("nm_using_location")}`
                : `📍 ${t("nm_use_my_location")}`}
            </button>

            <span className="text-sm text-ink-400 self-center">{t("common_or")}</span>

            <input
              type="text"
              value={place}
              onChange={(e) => {
                setPlace(e.target.value);
                // Typing a place means they've chosen that instead of GPS.
                if (e.target.value) setCoordinates(null);
              }}
              placeholder={t("nm_place_placeholder")}
              className="flex-1 border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary-gradient text-white font-semibold px-6 py-3 rounded-2xl shadow-soft hover:scale-[1.02] transition-all disabled:opacity-50 hover-lift"
          >
            {isLoading ? t("common_searching") : `🔍 ${t("nm_find_btn")}`}
          </button>

        </div>
      </form>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {result && (
        <NearbyResults result={result} sortBy={sortBy} onSortChange={setSortBy} />
      )}
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
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <div className="text-4xl mb-3">🤷</div>
        <p className="font-semibold text-ink-900 mb-1">
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
          emoji="💰"
          mandi={bestPaying}
          tone="good"
        />
        <HighlightCard title={t("nm_closest_to_you")} emoji="📍" mandi={nearest} tone="neutral" />
      </div>

      {/* ---- The trade-off, worked out for them ---- */}
      {tradeOff && tradeOff.extraRupeesPerQuintal > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 text-sm text-amber-900">
          💡{" "}
          {t("nm_tradeoff", {
            extra: tradeOff.extraRupeesPerQuintal.toLocaleString("en-IN"),
            km: tradeOff.extraKm,
            total: (tradeOff.extraRupeesPerQuintal * 10).toLocaleString("en-IN"),
          })}
        </div>
      )}

      {/* ---- Where we searched from ---- */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon="🏛️" label={t("nm_mandis_found")} value={result.totalFound} tone="primary" />
        <StatCard icon="📏" label={t("nm_search_radius")} value={`${radiusKm} km`} />
        <StatCard icon="📍" label={t("nm_searched_around")} value={shortLabel(origin.label)} />
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
        <h2 className="font-semibold text-ink-900">
          {t("nm_all_within", { count: result.totalFound, radius: radiusKm })}
        </h2>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-500">{t("nm_sort_by")}</span>
          <button
            type="button"
            onClick={() => onSortChange("price")}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              sortBy === "price"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-gray-100 text-ink-600 hover:bg-gray-200"
            }`}
          >
            💰 {t("nm_sort_price")}
          </button>
          <button
            type="button"
            onClick={() => onSortChange("distance")}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              sortBy === "distance"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-gray-100 text-ink-600 hover:bg-gray-200"
            }`}
          >
            📍 {t("nm_sort_distance")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-200/70 text-ink-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">{t("common_mandi")}</th>
                {/* A ▼ on whichever column the list is currently ordered
                    by, so the sort state is readable from the table
                    itself and not only from the buttons above it. */}
                <th
                  className={`text-right px-4 py-3 font-semibold ${
                    sortBy === "distance" ? "text-primary-700" : ""
                  }`}
                >
                  {t("nm_col_distance")}
                  {sortBy === "distance" ? " ▼" : ""}
                </th>
                <th
                  className={`text-right px-4 py-3 font-semibold ${
                    sortBy === "price" ? "text-primary-700" : ""
                  }`}
                >
                  🏛️ {t("common_government")}
                  {sortBy === "price" ? " ▼" : ""}
                  <span className="block text-[11px] font-normal text-ink-400">
                    {t("common_per_quintal")}
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold">
                  🧑‍🌾 {t("common_our_farmers")}
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
                    index === 0 ? "bg-green-50/50" : ""
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
                  <td className="px-4 py-3 text-right font-semibold text-primary-700">
                    ₹{mandi.modalPrice.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {mandi.farmerReportedPrice ? (
                      <>
                        <span className="font-semibold text-amber-600">
                          ₹{mandi.farmerReportedPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-[11px] text-ink-400">
                          {tPlural("report_count", mandi.farmerReportCount)}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
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
        {result.dataSource === "mock" && ` ⚠️ ${t("nm_footnote_mock")}`}
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
        <span className="font-semibold">~{Math.round(mandi.distanceKm)} km</span>
        <span className="block text-[11px] text-amber-600">{t("nm_rough_estimate")}</span>
      </>
    );
  }

  if (mandi.distanceKm < DISTRICT_PRECISION_KM) {
    return (
      <>
        <span className="font-semibold text-primary-700">{t("nm_in_your_area")}</span>
        <span className="block text-[11px] text-ink-400">{t("nm_same_district")}</span>
      </>
    );
  }

  return <span className="font-semibold">{Math.round(mandi.distanceKm)} km</span>;
}

// One of the two big answer cards at the top.
function HighlightCard({ title, emoji, mandi, tone }) {
  const { t } = useLanguage();

  if (!mandi) return null;

  const styles =
    tone === "good"
      ? "bg-green-50 border-green-200 text-green-900"
      : "bg-sky-50 border-sky-200 text-sky-900";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${tone === "good" ? styles : styles} hover-lift`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
        {emoji} {title}
      </p>
      <p className="text-lg font-bold leading-tight">{mandi.mandiName}</p>
      <p className="text-sm opacity-70 mb-2">
        {mandi.district ? `${mandi.district}, ` : ""}
        {mandi.state}
      </p>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold">
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
