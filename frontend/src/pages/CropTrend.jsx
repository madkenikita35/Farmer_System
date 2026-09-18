// pages/CropTrend.jsx
// -----------------------------------------------------------------------
// /crops/:cropName - the price trend for one crop, from CEDA Agmarknet.
//
// Three views, switched by tabs with no page reload:
//
//   City     -> one district   (dropdown of 640 districts)
//   State    -> one state      (dropdown of 36 states)
//   Country  -> all India, one national average line
//
// Plus a date range: last 7 / 30 days, 6 months, all, or a custom pair.
//
// =======================================================================
// WHY THE DATE PRESETS ARE NOT RELATIVE TO TODAY
// =======================================================================
// This is the part that will look wrong until you know why.
//
// CEDA's data runs from 2010 to 2025-10-30 and stops. There is no data
// for the current date. So "last 7 days" measured from today returns an
// empty chart, every time, for every crop - the feature would look
// completely broken while working perfectly.
//
// Instead the presets are anchored to the LATEST DATE THAT HAS DATA,
// which the backend reports as `coverage.to`. "Last 30 days" therefore
// means the last 30 days of available data. The real range is printed
// under the chart so the label can never mislead.
//
// The first load asks for the backend's default window to discover the
// coverage; after that the presets have something to anchor to.
//
// ---------------------------------------------------------------------
// A NOTE ON "CITY"
// ---------------------------------------------------------------------
// CEDA's hierarchy is state -> district -> market; there is no city in
// it. The City tab filters by DISTRICT, which is the closest thing and
// what the /api/locations dropdown is built from.
// -----------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";

import { getCedaPriceTrend, getCedaLocations } from "../api/api";
import PriceTrendChart from "../components/PriceTrendChart";
import CedaAttribution from "../components/CedaAttribution";
import { useLanguage } from "../context/LanguageContext";
import { formatRupees } from "../components/chartTheme";

// `days: null` means "everything we have".
const DATE_RANGES = [
  { key: "7", days: 7 },
  { key: "30", days: 30 },
  { key: "180", days: 180 },
  { key: "all", days: null },
];

/** N days before an anchor date, as "YYYY-MM-DD". */
function isoDaysBefore(anchorIso, days) {
  const date = new Date(anchorIso);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function CropTrend() {
  const { t } = useLanguage();
  const { cropName } = useParams();
  const crop = decodeURIComponent(cropName || "");

  // ---- Controls ----
  const [level, setLevel] = useState("country");
  const [location, setLocation] = useState("");
  const [rangeKey, setRangeKey] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // ---- Data ----
  const [trend, setTrend] = useState(null);
  const [places, setPlaces] = useState({ states: [], districts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // The last date CEDA actually has, learned from the first response.
  // Everything about the date presets hangs off this - see the note at
  // the top of the file.
  const [latestAvailable, setLatestAvailable] = useState("");

  // ---- The dropdown lists, loaded once ----
  useEffect(() => {
    async function loadPlaces() {
      try {
        const response = await getCedaLocations();
        setPlaces({
          states: response.data.states || [],
          districts: response.data.districts || [],
        });
      } catch (error) {
        // Not fatal: the Country view needs no dropdown, so the page is
        // still useful. The two other tabs will say the list is empty.
        console.error("Could not load locations:", error);
      }
    }

    loadPlaces();
  }, []);

  // ---- Work out the from/to to ask for ----
  const { from, to } = useMemo(() => {
    if (rangeKey === "custom") return { from: customFrom, to: customTo };

    const range = DATE_RANGES.find((r) => r.key === rangeKey);

    // "All", or we do not yet know where the data ends: let the backend
    // pick its default window. That first answer is what teaches us the
    // coverage.
    if (!range || range.days == null || !latestAvailable) {
      return { from: "", to: "" };
    }

    return {
      from: isoDaysBefore(latestAvailable, range.days),
      to: latestAvailable,
    };
  }, [rangeKey, customFrom, customTo, latestAvailable]);

  // ---- Fetch whenever anything that shapes the query changes ----
  useEffect(() => {
    if (level !== "country" && !location) {
      setTrend(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getCedaPriceTrend({ cropName: crop, level, location, from, to });

        // The farmer may have switched tabs while this was in flight.
        // Dropping a stale response stops a slower older answer
        // overwriting a newer one.
        if (cancelled) return;

        setTrend(response.data);

        // Learn where the data ends, so the presets have an anchor.
        if (response.data.coverage?.to && !latestAvailable) {
          setLatestAvailable(response.data.coverage.to);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load the price trend:", error);
        setErrorMessage(error.response?.data?.message || t("trend_err_load"));
        setTrend(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop, level, location, from, to]);

  function handleLevelChange(nextLevel) {
    setLevel(nextLevel);
    setLocation(""); // a state name is not a valid district, and vice versa
  }

  // The options for whichever dropdown is showing.
  const dropdownOptions =
    level === "city"
      ? places.districts.map((d) => ({
          value: d.districtName,
          label: `${d.districtName} — ${d.stateName}`,
        }))
      : places.states.map((s) => ({ value: s.stateName, label: s.stateName }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fadeIn">
      <Link to="/crops" className="text-primary-700 font-semibold text-sm mb-4 inline-block">
        {t("trend_back")}
      </Link>

      <h1 className="text-2xl font-bold text-ink-900 mb-1">📈 {crop}</h1>
      <p className="text-ink-600 mb-6">{t("trend_subtitle_ceda")}</p>

      {/* ---------- Level tabs ---------- */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: "city", labelKey: "trend_level_city", icon: "🏪" },
          { key: "state", labelKey: "trend_level_state", icon: "🗺️" },
          { key: "country", labelKey: "trend_level_country", icon: "🇮🇳" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleLevelChange(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              level === tab.key
                ? "bg-primary-600 text-white border-transparent shadow-soft scale-[1.03]"
                : "bg-white text-ink-600 border-surface-300 hover:border-ink-300 hover:bg-surface-100"
            }`}
          >
            {tab.icon} {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* ---------- Filters ---------- */}
      <div className="bg-white rounded-2xl shadow-soft p-5 border border-surface-300/60 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          {level !== "country" && (
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">
                {level === "city" ? t("trend_pick_city") : t("trend_pick_state")}
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{t("trend_choose")}</option>
                {dropdownOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              {t("trend_date_range")}
            </label>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.key}
                  type="button"
                  onClick={() => setRangeKey(range.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    rangeKey === range.key
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-gray-100 text-ink-600 hover:bg-gray-200"
                  }`}
                >
                  {range.days == null
                    ? t("trend_range_all")
                    : range.days === 180
                    ? t("trend_range_months", { months: 6 })
                    : t("trend_range_days", { days: range.days })}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRangeKey("custom")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  rangeKey === "custom"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-gray-100 text-ink-600 hover:bg-gray-200"
                }`}
              >
                {t("trend_range_custom")}
              </button>
            </div>
          </div>
        </div>

        {rangeKey === "custom" && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-surface-200">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">{t("trend_from")}</label>
              <input
                type="date"
                value={customFrom}
                max={latestAvailable || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white
                  focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">{t("trend_to")}</label>
              <input
                type="date"
                value={customTo}
                // Cannot end before it starts, and cannot ask beyond the
                // data - both are made impossible rather than explained
                // after the fact.
                min={customFrom || undefined}
                max={latestAvailable || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white
                  focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* Why the presets do not mean "from today". Said once, quietly. */}
        {latestAvailable && (
          <p className="text-xs text-ink-400 mt-3">
            {t("trend_coverage_note", { date: latestAvailable })}
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {trend && trend.pointCount > 0 && <TrendSummary trend={trend} />}

      {/* ---------- The chart ---------- */}
      {level !== "country" && !location ? (
        <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 py-14 px-6 text-center">
          <div className="text-4xl mb-3">👆</div>
          <p className="font-semibold text-ink-900 mb-1">{t("trend_pick_first_title")}</p>
          <p className="text-sm text-ink-500">
            {level === "city" ? t("trend_pick_city") : t("trend_pick_state")}
          </p>
        </div>
      ) : (
        <PriceTrendChart points={trend?.points} isLoading={isLoading} crop={crop} />
      )}

      {/* The range actually plotted, so a preset label can never lie. */}
      {trend?.coverage && (
        <p className="text-xs text-ink-500 mt-3">
          {t("trend_showing_range", { from: trend.coverage.from, to: trend.coverage.to })}
        </p>
      )}

      {/* CEDA's terms require this wherever their data appears. */}
      <CedaAttribution className="mt-4" />
    </div>
  );
}

// Headline numbers above the chart.
function TrendSummary({ trend }) {
  const { t } = useLanguage();

  const prices = trend.points.map((p) => p.averagePrice);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const latest = prices[prices.length - 1];
  const change =
    prices.length > 1 ? Math.round(((latest - prices[0]) / prices[0]) * 100) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <SummaryTile label={t("trend_latest")} value={formatRupees(latest)} />
      <SummaryTile label={t("trend_highest")} value={formatRupees(highest)} tone="good" />
      <SummaryTile label={t("trend_lowest")} value={formatRupees(lowest)} tone="bad" />
      <SummaryTile
        label={t("trend_change")}
        value={change == null ? "-" : `${change > 0 ? "+" : ""}${change}%`}
        tone={change == null ? undefined : change >= 0 ? "good" : "bad"}
      />
    </div>
  );
}

function SummaryTile({ label, value, tone }) {
  const colour =
    tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-600" : "text-ink-900";

  return (
    <div className="bg-white rounded-xl border border-surface-300/60 px-4 py-3">
      <p className="text-xs text-ink-500 truncate">{label}</p>
      <p className={`text-lg font-bold leading-tight ${colour}`}>{value}</p>
    </div>
  );
}

export default CropTrend;
