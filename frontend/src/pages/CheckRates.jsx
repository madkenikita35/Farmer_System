// pages/CheckRates.jsx
// -----------------------------------------------------------------------
// This is the app's SECOND main feature (the first is Upload.jsx):
// a farmer can check crop rates BEFORE selling anything, across
// different mandis, using TWO data sources at once:
//
//   1. GOVERNMENT data  - official data.gov.in Agmarknet prices
//   2. COMMUNITY data   - what OTHER FARMERS using this app actually
//                          got paid recently, for the same crop
//
// No receipt upload needed here - just type a crop name (and
// optionally your state) and see both sides, so you can decide WHERE
// and WHEN to sell with more confidence.
// -----------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { compareMandiPrices } from "../api/api";
import StatCard from "../components/StatCard";
import MandiTrendChart from "../components/MandiTrendChart";
import CommunityPriceChart from "../components/CommunityPriceChart";
import { useLanguage } from "../context/LanguageContext";
import ScopeComparisonCards from "../components/ScopeComparisonCards";

function CheckRates() {
  const { t } = useLanguage();

  // The crop ticker on the home page links here as
  // /check-rates?crop=Wheat, so read that and search for it straight
  // away - otherwise clicking a crop would just dump you on an empty
  // form and you would have to type its name again.
  const [searchParams] = useSearchParams();
  const cropFromUrl = searchParams.get("crop") || "";

  const [crop, setCrop] = useState(cropFromUrl);
  const [state, setState] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ---- Location, for the "Near You" and "State Level" cards ----
  //
  // The SAME approach as the Near Me page: ask the browser, and tell
  // the farmer which problem it was if it fails, rather than silently
  // falling back to somewhere they are not.
  const [coordinates, setCoordinates] = useState(null);
  const [radiusKm, setRadiusKm] = useState(50);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setErrorMessage(t("nm_err_no_geolocation"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setCoordinates(next);
        // Re-run straight away so the two location cards fill in
        // without making the farmer press Check Rates again.
        if (crop.trim()) runSearch(crop, { coordinates: next });
      },
      (error) => {
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

  // Pulled out of the form handler so the effect below can call it too.
  // `overrides` lets a caller pass freshly-obtained coordinates without
  // waiting for a state update to land - setCoordinates is async, so
  // reading `coordinates` here right after setting it would still see
  // the old value.
  async function runSearch(cropName, overrides = {}) {
    if (!cropName.trim()) {
      setErrorMessage(t("cr_err_need_crop"));
      return;
    }

    const where = overrides.coordinates || coordinates;
    const radius = overrides.radiusKm || radiusKm;

    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await compareMandiPrices(cropName.trim(), state.trim(), date, {
        lat: where?.lat,
        lon: where?.lon,
        radius,
      });
      setResult(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage(t("cr_err_fetch"));
    } finally {
      setIsLoading(false);
    }
  }

  // Changing the radius only affects the "Near You" card, but the
  // filtering happens server-side, so it needs another call.
  function handleRadiusChange(nextRadius) {
    setRadiusKm(nextRadius);
    if (crop.trim() && result) runSearch(crop, { radiusKm: nextRadius });
  }

  async function handleSearch(e) {
    e.preventDefault(); // stop the browser's default "reload the page" form behaviour
    runSearch(crop);
  }

  // If we arrived with ?crop=... in the URL, search for it immediately.
  // The ref guard makes this happen ONCE: without it, every re-render
  // that touched `state` or `date` would fire another API call.
  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (cropFromUrl && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      runSearch(cropFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropFromUrl]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">🔍 {t("cr_title")}</h1>
      <p className="text-ink-600 mb-6">{t("cr_subtitle")}</p>

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-card rounded-2xl shadow-soft p-6 border border-surface-300/60 grid sm:grid-cols-4 gap-4 mb-8"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("common_crop")}</label>
          <input
            type="text"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder={t("cr_placeholder_crop")}
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("cr_label_state")}</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder={t("cr_placeholder_state")}
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("common_date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary-gradient text-primary-foreground font-semibold px-6 py-3 rounded-2xl shadow-soft hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {isLoading ? t("common_searching") : `🔍 ${t("cr_btn_check")}`}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- The three-scope comparison ---------- */}
      {/* Above ResultsView because it answers the question the farmer
          came with - where should I sell - while the charts below are
          for reading the detail afterwards. */}
      {(result || isLoading) && (
        <ScopeComparisonCards
          scopes={result?.scopes}
          isLoading={isLoading}
          radiusKm={radiusKm}
          onRadiusChange={handleRadiusChange}
          onUseLocation={handleUseMyLocation}
          hasLocation={Boolean(coordinates)}
        />
      )}

      {/* ---------- Results ---------- */}
      {result && <ResultsView result={result} />}
    </div>
  );
}

// Everything shown once a search has actually returned a result.
// Split into its own component to keep CheckRates() above focused on
// the FORM, and this one focused on the DISPLAY.
function ResultsView({ result }) {
  const { t, tPlural } = useLanguage();

  const { government, community, bestMandi, worstMandi, priceGap, priceGapPercent, rankedMandis } =
    result;

  // A short, honest note about where the government numbers came from -
  // the same "real vs mock" idea shown on the Upload result screen.
  const govtSourceLabel = {
    "real-exact-date": `✅ ${t("cr_src_real", { date: government.matchedDate })}`,
    "real-nearest-date": `✅ ${t("cr_src_real_nearest", { date: government.matchedDate })}`,
    mock: `⚠️ ${t("cr_src_mock")}`,
  }[government.dataSource];

  return (
    <div>
      {/* ---- Top-level averages from each data source ---- */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon="🏛️"
          label={t("cr_gov_average")}
          value={government.averagePrice ?? "-"}
          tone="primary"
        />
        <StatCard
          icon="🧑‍🌾"
          label={t("cr_farmer_average")}
          value={community.averagePrice ?? "-"}
          tone="accent"
        />
        <StatCard
          icon="📝"
          label={t("cr_reports_found")}
          value={community.reportCount}
        />
      </div>

      {/* ---- WHERE SHOULD YOU SELL? The highest vs lowest mandi ---- */}
      {/* This is the most actionable thing on the page, so it sits
          right at the top, before any charts. The backend works out
          the ranking across BOTH data sources - see
          findBestAndWorstMandis() in backend/controllers/mandiController.js */}
      {/* The old national-only highest/lowest pair used to sit here.
          It is now the third of the three scope cards above, which
          shows the same comparison plus the distance it was missing -
          so keeping it here as well would say the same thing twice. */}

      {priceGap > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl px-5 py-4 mb-6 text-sm text-warning-900">
          💡{" "}
          {t("cr_gap_note", {
            gap: priceGap.toLocaleString("en-IN"),
            percent: priceGapPercent,
            total: (priceGap * 10).toLocaleString("en-IN"),
          })}
        </div>
      )}

      <p className="text-xs text-ink-500 mb-6">{govtSourceLabel}</p>

      {/* ---- The full ranking, best to worst ---- */}
      {rankedMandis && rankedMandis.length > 2 && (
        <details className="bg-card rounded-2xl shadow-soft border border-surface-300/60 mb-6">
          {/* <details>/<summary> is plain HTML - it gives you a
              collapsible section with no JavaScript at all. */}
          <summary className="cursor-pointer px-6 py-4 font-semibold text-ink-900">
            📊 {t("cr_see_all_ranked", { count: rankedMandis.length })}
          </summary>
          <div className="px-6 pb-5 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-ink-500 text-left">
                <tr>
                  <th className="py-2 font-semibold">#</th>
                  <th className="py-2 font-semibold">{t("common_mandi")}</th>
                  <th className="py-2 font-semibold">{t("common_source")}</th>
                  <th className="py-2 font-semibold text-right">{t("common_per_quintal")}</th>
                </tr>
              </thead>
              <tbody>
                {rankedMandis.map((offer, index) => (
                  <tr
                    key={`${offer.mandiName}-${offer.source}-${index}`}
                    className="border-t border-surface-200"
                  >
                    <td className="py-2 text-ink-400">{index + 1}</td>
                    <td className="py-2">
                      <span className="font-medium text-ink-900">{offer.mandiName}</span>
                      <span className="block text-xs text-ink-400">{offer.state}</span>
                    </td>
                    <td className="py-2">
                      <SourceChip source={offer.source} reportCount={offer.reportCount} />
                    </td>
                    <td className="py-2 text-right font-semibold">
                      ₹{offer.price.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ---- The two charts, side by side on wide screens ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-soft p-6 border border-surface-300/60">
          <h2 className="font-semibold text-ink-900 mb-3">🏛️ {t("cr_chart_gov")}</h2>
          <MandiTrendChart data={government.prices} />
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-6 border border-surface-300/60">
          <h2 className="font-semibold text-ink-900 mb-3">🧑‍🌾 {t("cr_chart_farmers")}</h2>
          <CommunityPriceChart data={community.records} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// One of the two big "best / worst mandi" cards at the top of the
// results. `tone` is just "good" or "bad" and picks the colour scheme.
// ---------------------------------------------------------------------
function MandiOfferCard({ title, emoji, offer, tone }) {
  const { t } = useLanguage();

  const styles =
    tone === "good"
      ? "bg-positive-50 border-positive-200 text-positive-900"
      : "bg-negative-50 border-negative-200 text-negative-900";

  const priceColor = tone === "good" ? "text-positive-700" : "text-negative-700";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
        {emoji} {title}
      </p>
      <p className="text-lg font-bold leading-tight">{offer.mandiName}</p>
      <p className="text-sm opacity-70 mb-2">{offer.state}</p>

      <p className={`text-3xl font-bold ${priceColor}`}>
        ₹{offer.price.toLocaleString("en-IN")}
        <span className="text-sm font-normal opacity-60"> {t("common_per_quintal")}</span>
      </p>

      <div className="mt-2">
        <SourceChip source={offer.source} reportCount={offer.reportCount} />
      </div>
    </div>
  );
}

// A little label saying whether a price came from the government or
// from other farmers - so the farmer always knows what they're looking at.
function SourceChip({ source, reportCount }) {
  const { t, tPlural } = useLanguage();

  if (source === "government") {
    return (
      <span className="inline-block bg-white/70 text-xs px-2 py-1 rounded-full font-medium">
        🏛️ {t("src_government_listed")}
      </span>
    );
  }

  // The "1 report / 2 reports" choice is made by tPlural, not by a
  // ternary bolted onto an English "s". Plurals do not work that way in
  // most of the languages this app offers.
  return (
    <span className="inline-block bg-white/70 text-xs px-2 py-1 rounded-full font-medium">
      🧑‍🌾 {tPlural("src_farmer_reports", reportCount)}
    </span>
  );
}

export default CheckRates;
