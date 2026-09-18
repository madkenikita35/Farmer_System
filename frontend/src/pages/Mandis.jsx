// pages/Mandis.jsx
// -----------------------------------------------------------------------
// THE MANDI DIRECTORY.
//
// This page answers three things:
//   1. How many mandis are registered in the government dataset?
//   2. Let me search through them (by mandi, district or state name).
//   3. Click one -> see every crop sold there and its price.
//      (That's the next page, MandiDetail.jsx.)
//
// A NOTE ON HOW THE SEARCH WORKS
// The backend downloads the mandi list from data.gov.in ONCE and keeps
// it in memory for 6 hours (see backend/services/mandiDirectoryService.js).
// So the first load takes a few seconds, and every search after that is
// instant. That's why we show a clear "Loading..." state below.
// -----------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getMandiList, getCropCoverage } from "../api/api";
import StatCard from "../components/StatCard";
import CollapsibleSection from "../components/CollapsibleSection";
import { useLanguage } from "../context/LanguageContext";
import CropCoverageCharts from "../components/CropCoverageCharts";
import PickList from "../components/PickList";

function Mandis() {
  const { t } = useLanguage();

  // What the user has typed / picked
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");

  // What came back from the server
  const [mandis, setMandis] = useState([]);
  const [totalMandis, setTotalMandis] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [states, setStates] = useState([]);

  // The UNFILTERED mandi list, kept so the dropdown always offers every
  // mandi rather than only the ones matching the current search - which
  // would mean you could never widen a search once you had narrowed it.
  const [allMandis, setAllMandis] = useState([]);
  const [dataSource, setDataSource] = useState("");
  const [fallbackReason, setFallbackReason] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // The crop-coverage charts. Loaded separately from the mandi list
  // because the two are independent: if the charts fail, the directory
  // below them still works, and vice versa.
  const [coverage, setCoverage] = useState(null);

  // Load the full list once, when the page first opens.
  useEffect(() => {
    loadMandis("", "");
    loadCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The charts are a bonus on top of the directory, so a failure here
  // is swallowed rather than shown as a page-level error. The charts
  // simply do not render (CropCoverageCharts returns null on no data).
  async function loadCoverage() {
    try {
      const response = await getCropCoverage(10);
      setCoverage(response.data);
    } catch (error) {
      console.error("Could not load crop coverage charts:", error);
      setCoverage(null);
    }
  }

  async function loadMandis(searchTerm, stateFilter) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await getMandiList(searchTerm, stateFilter);
      setMandis(response.data.mandis);
      setTotalMandis(response.data.totalMandis);
      setMatchCount(response.data.matchCount);
      setStates(response.data.states);

      // Capture the full list the first time it arrives unfiltered.
      if (!searchTerm && !stateFilter) {
        setAllMandis(response.data.mandis || []);
      }
      setDataSource(response.data.dataSource);
      setFallbackReason(response.data.fallbackReason || null);
    } catch (error) {
      console.error(error);
      setErrorMessage(t("md_err_load"));
    } finally {
      setIsLoading(false);
    }
  }

  // { "Maharashtra": ["Pune", "Nashik"], ... } for the dropdown.
  //
  // useMemo because this runs over every mandi in India and the result
  // only changes when the list does - without it, the whole thing would
  // be rebuilt on every keystroke elsewhere on the page.
  const mandiOptionsByState = useMemo(() => {
    const grouped = {};

    for (const mandi of allMandis) {
      const stateName = mandi.state || "-";
      if (!grouped[stateName]) grouped[stateName] = [];
      grouped[stateName].push(mandi.mandiName);
    }

    // Sorted so the same mandi is always in the same place in the list.
    for (const stateName of Object.keys(grouped)) {
      grouped[stateName].sort();
    }

    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
    );
  }, [allMandis]);

  function handleSearch(e) {
    e.preventDefault();
    loadMandis(search.trim(), selectedState);
  }

  function handleReset() {
    setSearch("");
    setSelectedState("");
    loadMandis("", "");
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">🏛️ {t("md_title")}</h1>
      <p className="text-ink-600 mb-6">{t("md_subtitle")}</p>

      {/* ---------- Summary cards ---------- */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon="🏛️"
          label={t("md_total_registered")}
          value={totalMandis}
          tone="primary"
        />
        <StatCard icon="🔍" label={t("md_matching_search")} value={matchCount} />
        <StatCard icon="🗺️" label={t("md_states_covered")} value={states.length} />
      </div>

      {/* ---------- Which crops are everywhere, and which are rare ----------
           FOLDED AWAY by default. It used to be two permanently-open bar
           charts sitting above the search box, so the page you opened to
           look something up began with something else entirely.

           It is genuinely interesting - just not what most people came
           for - so it keeps its place in the order and loses its claim
           on the screen. */}
      {coverage && (
        <CollapsibleSection
          title={`📊 ${t("md_charts_title")}`}
          subtitle={t("md_charts_note", {
            mandis: coverage.totalMandis,
            crops: coverage.totalCrops,
          })}
          className="mb-8"
        >
          <CropCoverageCharts coverage={coverage} />
        </CollapsibleSection>
      )}

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-card rounded-2xl shadow-soft p-6 border border-surface-300/60 grid sm:grid-cols-4 gap-4 mb-6"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-600 mb-1">
            {t("md_search_label")}
          </label>
          {/* Was a text box. Mandi names in the government feed are
              spelled in ways nobody would guess - "Ratnagiri Nachane",
              "Bhindi(Ladies Finger)" - so typing one correctly was
              mostly luck. Grouped by state to keep the list navigable.

              Picking one searches for it immediately: with a dropdown
              there is nothing left to finish typing, so making someone
              press Search as well would just be an extra tap. */}
          <PickList
            value={search}
            onChange={(name) => {
              setSearch(name);
              loadMandis(name, selectedState);
            }}
            groups={mandiOptionsByState}
            placeholder={t("md_all_mandis")}
            isLoading={allMandis.length === 0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">{t("common_state")}</label>
          {/* A <select> built from the states the backend actually
              returned, so we never offer a state with zero mandis. */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">{t("common_all_states")}</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-brand-green hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            🔍 {t("common_search")}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-input text-ink-600 hover:bg-muted"
          >
            {t("common_reset")}
          </button>
        </div>
      </form>

      {/* Say WHY we're showing sample data. The old version always blamed
          a missing API key, which was wrong (and misleading to debug)
          whenever the key was fine and the government API had simply
          timed out. */}
      {dataSource === "mock" && (
        <div className="text-xs text-warning-800 bg-warning-50 border border-warning-200 rounded-lg px-4 py-3 mb-4">
          <p className="font-semibold mb-1">⚠️ {t("md_mock_title")}</p>
          <p>
            {t(
              {
                "no-api-key": "md_mock_no_key",
                "api-unreachable": "md_mock_unreachable",
                "api-returned-nothing": "md_mock_nothing",
                "unexpected-error": "md_mock_unexpected",
              }[fallbackReason] || "md_mock_generic"
            )}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- Results ---------- */}
      {isLoading ? (
        <div className="text-center py-16 text-ink-500">
          <div className="text-3xl mb-2 animate-pulse">🌾</div>
          <p className="text-sm">{t("md_loading")}</p>
        </div>
      ) : mandis.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-card rounded-2xl border border-border">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-medium">{t("md_none_title")}</p>
          <p className="text-sm mt-1">{t("md_none_text", { total: totalMandis })}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mandis.map((mandi) => (
            <MandiCard key={`${mandi.mandiName}-${mandi.state}`} mandi={mandi} />
          ))}
        </div>
      )}
    </div>
  );
}

// One clickable card per mandi. Pulled out as its own small component
// so the main list above stays easy to read.
function MandiCard({ mandi }) {
  const { t } = useLanguage();

  // We pass the mandi name and state along in the URL, because two
  // states can each have a mandi with the same name.
  // encodeURIComponent() makes names with spaces or brackets safe to
  // put in a URL - e.g. "APMC Ratnagiri (Nachane)".
  const link = `/mandis/view?mandi=${encodeURIComponent(
    mandi.mandiName
  )}&state=${encodeURIComponent(mandi.state)}`;

  return (
    <Link
      to={link}
      className="block bg-card rounded-2xl shadow-soft border border-surface-300/60 p-5 hover:border-brand-green hover-lift animate-popIn"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-ink-900 leading-tight">
          {mandi.mandiName}
        </h3>
        <span className="text-xl">🏛️</span>
      </div>

      <p className="text-sm text-ink-500 mb-3">
        {mandi.district ? `${mandi.district}, ` : ""}
        {mandi.state}
      </p>

      <div className="flex items-center gap-2 text-xs">
        <span className="bg-positive-50 text-positive-700 px-2 py-1 rounded-full font-medium">
          {t("md_crop_count", { count: mandi.cropCount })}
        </span>
        {mandi.latestDate && (
          <span className="text-ink-400">{t("md_as_of", { date: mandi.latestDate })}</span>
        )}
      </div>

      <p className="text-xs text-primary-700 font-semibold mt-3">
        {t("md_view_all_crops")}
      </p>
    </Link>
  );
}

export default Mandis;
