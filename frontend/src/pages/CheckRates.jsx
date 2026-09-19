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
import { compareMandiPrices, getMandiList } from "../api/api";
import MandiTrendChart from "../components/MandiTrendChart";
import CommunityPriceChart from "../components/CommunityPriceChart";
import { useLanguage } from "../context/LanguageContext";
import ScopeComparisonCards from "../components/ScopeComparisonCards";
import DataFreshness from "../components/DataFreshness";
import CropSelect from "../components/CropSelect";
import PickList from "../components/PickList";
import {
  ICON_MD,
  ICON_LG,
  ICON_STROKE,
  ChartIcon,
  FarmersIcon,
  MandiIcon,
  SearchIcon,
  TipIcon,
  TrendIcon,
  ReceiptIcon,
} from "../components/icons";

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

  // The states that actually have mandis reporting, for the dropdown.
  // Asked for once when the page opens rather than on every search -
  // the list does not change while someone is standing here.
  const [states, setStates] = useState([]);

  useEffect(() => {
    getMandiList("", "")
      .then((response) => setStates(response.data.states || []))
      .catch((error) => {
        // A missing list is not worth an error message on screen: the
        // dropdown simply shows "All states" and the search still
        // works without a state filter.
        console.error("Could not load the state list:", error);
      });
  }, []);

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
      <h1 className="text-2xl font-semibold text-ink-900 mb-2"><SearchIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("cr_title")}</h1>
      <p className="text-ink-600 mb-6">{t("cr_subtitle")}</p>

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 grid sm:grid-cols-4 gap-4 mb-8"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("common_crop")}</label>
          {/* Was a text box. "Tomatoe" and "onoin" came back as "no
              prices found", which is indistinguishable from there
              genuinely being no prices. Same dropdown as Near Me. */}
          <CropSelect value={crop} onChange={setCrop} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("cr_label_state")}</label>
          {/* Built from the states the backend actually returned, so it
              can never offer one with no mandis in it. */}
          <PickList
            value={state}
            onChange={setState}
            options={states}
            placeholder={t("common_all_states")}
            isLoading={states.length === 0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("common_date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-ink-200 rounded-md px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary-gradient text-primary-foreground font-medium px-6 py-3 rounded-lg shadow-soft hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {isLoading ? t("common_searching") : `${t("cr_btn_check")}`}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-md px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- The headline numbers ---------- */}
      {/* One slim row rather than three tall cards. They are context,
          not the answer - so they get a line, and the comparison cards
          below get the room. */}
      {result && <QuickStats result={result} />}

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

      {/* The date the farmer PICKED is passed in, so if they are looking
          at last month the label says so instead of implying the sync
          time is the data's date. */}
      {result && <DataFreshness source="agmarknet" forDate={date} className="mt-4" />}
    </div>
  );
}

// ---------------------------------------------------------------------
// The slim headline row: government average, farmer average, and how
// many farmer reports it was built from.
//
// It replaced three <StatCard>s in a grid. Those are the right shape
// for a dashboard, where the numbers ARE the page; here they pushed the
// thing the farmer actually came for below the fold on a phone.
//
// Written as one wrapping flex row rather than a 3-column grid so the
// items sit side by side on a phone and only wrap when they truly have
// to.
// ---------------------------------------------------------------------
function QuickStats({ result }) {
  const { t } = useLanguage();
  const { government, community } = result;

  const items = [
    { icon: MandiIcon, label: t("cr_gov_average"), value: government.averagePrice, isPrice: true },
    { icon: FarmersIcon, label: t("cr_farmer_average"), value: community.averagePrice, isPrice: true },
    { icon: ReceiptIcon, label: t("cr_reports_found"), value: community.reportCount, isPrice: false },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-card rounded-lg
        shadow-soft border border-surface-300/60 px-5 py-3.5 mb-6"
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5 min-w-0">
          <item.icon size={ICON_LG} strokeWidth={ICON_STROKE} className="text-ink-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400 truncate">
              {item.label}
            </p>
            <p className="font-semibold text-ink-900 leading-tight">
              {item.value == null
                ? "-"
                : item.isPrice
                ? `₹${Number(item.value).toLocaleString("en-IN")}`
                : item.value}
            </p>
          </div>
        </div>
      ))}
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
    "real-exact-date": `${t("cr_src_real", { date: government.matchedDate })}`,
    "real-nearest-date": `${t("cr_src_real_nearest", { date: government.matchedDate })}`,
    mock: `${t("cr_src_mock")}`,
  }[government.dataSource];

  return (
    <div>
      {/* The three averages that used to sit here are now the slim
          QuickStats row above the comparison cards - same numbers,
          a quarter of the height, and above the thing they describe. */}

      {/* ---- WHERE SHOULD YOU SELL? The highest vs lowest mandi ---- */}
      {/* This is the most actionable thing on the page, so it sits
          right at the top, before any charts. The backend works out
          the ranking across BOTH data sources - see
          findBestAndWorstMandis() in backend/controllers/mandiController.js */}
      {/* The old national-only highest/lowest pair used to sit here.
          It is now the third of the three scope cards above, which
          shows the same comparison plus the distance it was missing -
          so keeping it here as well would say the same thing twice. */}

      {/* ---- Why this number, and where it came from ---- */}
      {/* Both of these are worth reading once and then never again, so
          they fold away together instead of sitting on top of every
          search forever. Open by default the first time, because the
          price gap is genuinely the most useful sentence on the page -
          it is what a farmer is losing by going to the wrong mandi. */}
      <details open className="group mb-6">
        <summary
          className="cursor-pointer list-none flex items-center gap-2 px-4 py-2.5
            rounded-md bg-warning-50 border border-warning-200 text-sm
            font-medium text-warning-900 hover:bg-warning-100 transition-colors"
        >
          {/* Rotates to point down when the block is open. */}
          <span className="text-ink-400 transition-transform group-open:rotate-90">▶</span>
          <TipIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("cr_insights")}
        </summary>

        <div className="px-4 pt-3 space-y-2">
          {priceGap > 0 && (
            <p className="text-sm text-warning-900">
              {t("cr_gap_note", {
                gap: priceGap.toLocaleString("en-IN"),
                percent: priceGapPercent,
                total: (priceGap * 10).toLocaleString("en-IN"),
              })}
            </p>
          )}

          <p className="text-xs text-ink-500">{govtSourceLabel}</p>
        </div>
      </details>

      {/* ---- The full ranking, best to worst ---- */}
      {rankedMandis && rankedMandis.length > 2 && (
        <details className="bg-card rounded-lg shadow-soft border border-surface-300/60 mb-6">
          {/* <details>/<summary> is plain HTML - it gives you a
              collapsible section with no JavaScript at all. */}
          <summary className="cursor-pointer px-6 py-4 font-medium text-ink-900">
            <ChartIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("cr_see_all_ranked", { count: rankedMandis.length })}
          </summary>
          <div className="px-6 pb-5 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-ink-500 text-left">
                <tr>
                  <th className="py-2 font-medium">#</th>
                  <th className="py-2 font-medium">{t("common_mandi")}</th>
                  <th className="py-2 font-medium">{t("common_source")}</th>
                  <th className="py-2 font-medium text-right">{t("common_per_quintal")}</th>
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
                    <td className="py-2 text-right font-medium">
                      ₹{offer.price.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ---- The two charts ---- */}
      {/* CLOSED by default. This is the biggest single decluttering on
          the page: two charts is a lot of screen, and they answer
          "how has this been moving?" - a question you ask after you
          already know today's price, if at all. Nothing is removed,
          it is one tap away.

          <details>/<summary> is plain HTML: a collapsible section with
          no JavaScript and no state to keep. */}
      <details className="group bg-card rounded-lg shadow-soft border border-surface-300/60">
        <summary
          className="cursor-pointer list-none flex items-center gap-2 px-6 py-4
            font-medium text-ink-900"
        >
          <span className="text-ink-400 transition-transform group-open:rotate-90">▶</span>
          <TrendIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("cr_charts")}
        </summary>

        <div className="grid lg:grid-cols-2 gap-6 px-6 pb-6">
          <div>
            <h2 className="font-medium text-ink-900 mb-3"><MandiIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("cr_chart_gov")}</h2>
            <MandiTrendChart data={government.prices} />
          </div>

          <div>
            <h2 className="font-medium text-ink-900 mb-3"><FarmersIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("cr_chart_farmers")}</h2>
            <CommunityPriceChart data={community.records} />
          </div>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------
// One of the two big "best / worst mandi" cards at the top of the
// results. `tone` is just "good" or "bad" and picks the colour scheme.
// ---------------------------------------------------------------------
function MandiOfferCard({ title, emoji: Icon, offer, tone }) {
  const { t } = useLanguage();

  const styles =
    tone === "good"
      ? "bg-positive-50 border-positive-200 text-positive-900"
      : "bg-negative-50 border-negative-200 text-negative-900";

  const priceColor = tone === "good" ? "text-positive-700" : "text-negative-700";

  return (
    <div className={`rounded-lg border px-5 py-4 ${styles}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
        {Icon && <Icon size={ICON_MD} strokeWidth={ICON_STROKE} className="inline-block mr-1.5 align-[-2px]" aria-hidden="true" />}
        {title}
      </p>
      <p className="text-lg font-semibold leading-tight">{offer.mandiName}</p>
      <p className="text-sm opacity-70 mb-2">{offer.state}</p>

      <p className={`text-3xl font-semibold ${priceColor}`}>
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
        <MandiIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("src_government_listed")}
      </span>
    );
  }

  // The "1 report / 2 reports" choice is made by tPlural, not by a
  // ternary bolted onto an English "s". Plurals do not work that way in
  // most of the languages this app offers.
  return (
    <span className="inline-block bg-white/70 text-xs px-2 py-1 rounded-full font-medium">
      <FarmersIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {tPlural("src_farmer_reports", reportCount)}
    </span>
  );
}

export default CheckRates;
