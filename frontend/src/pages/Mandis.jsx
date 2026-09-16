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

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMandiList } from "../api/api";
import StatCard from "../components/StatCard";

function Mandis() {
  // What the user has typed / picked
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("");

  // What came back from the server
  const [mandis, setMandis] = useState([]);
  const [totalMandis, setTotalMandis] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [states, setStates] = useState([]);
  const [dataSource, setDataSource] = useState("");
  const [fallbackReason, setFallbackReason] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Load the full list once, when the page first opens.
  useEffect(() => {
    loadMandis("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMandis(searchTerm, stateFilter) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await getMandiList(searchTerm, stateFilter);
      setMandis(response.data.mandis);
      setTotalMandis(response.data.totalMandis);
      setMatchCount(response.data.matchCount);
      setStates(response.data.states);
      setDataSource(response.data.dataSource);
      setFallbackReason(response.data.fallbackReason || null);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Could not load the mandi list. Make sure the backend server is running."
      );
    } finally {
      setIsLoading(false);
    }
  }

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
      <h1 className="text-2xl font-bold text-ink-900 mb-2">🏛️ Mandi Directory</h1>
      <p className="text-ink-600 mb-6">
        Every mandi currently reporting prices to the government's Agmarknet
        dataset. Search for one, then open it to see all the crops it sells
        and what they're fetching.
      </p>

      {/* ---------- Summary cards ---------- */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon="🏛️"
          label="Total Mandis Registered"
          value={totalMandis}
          tone="primary"
        />
        <StatCard icon="🔍" label="Matching Your Search" value={matchCount} />
        <StatCard icon="🗺️" label="States Covered" value={states.length} />
      </div>

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60 grid sm:grid-cols-4 gap-4 mb-6"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-600 mb-1">
            Search mandi / district
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Ratnagiri, Azadpur, Indore"
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">State</label>
          {/* A <select> built from the states the backend actually
              returned, so we never offer a state with zero mandis. */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All states</option>
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
            className="flex-1 bg-brand-green hover:bg-brand-darkgreen text-white font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            🔍 Search
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-gray-300 text-ink-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Say WHY we're showing sample data. The old version always blamed
          a missing API key, which was wrong (and misleading to debug)
          whenever the key was fine and the government API had simply
          timed out. */}
      {dataSource === "mock" && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <p className="font-semibold mb-1">⚠️ Showing a small sample list, not live data.</p>
          <p>
            {
              {
                "no-api-key":
                  "No MANDI_API_KEY is set in the backend's .env file. Add a free key from data.gov.in and restart the backend.",
                "api-unreachable":
                  "The government data.gov.in API did not respond in time. Your API key is fine - this is usually a slow connection or the API being busy. The app will retry automatically within 2 minutes, so just press Search again shortly.",
                "api-returned-nothing":
                  "The government API responded but had no mandi records to give. This can happen early in the day before mandis report. Try again later.",
                "unexpected-error":
                  "Something unexpected went wrong while building the mandi list. Check the backend terminal for the error.",
              }[fallbackReason] || "Live mandi data could not be loaded right now."
            }
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- Results ---------- */}
      {isLoading ? (
        <div className="text-center py-16 text-ink-500">
          <div className="text-3xl mb-2 animate-pulse">🌾</div>
          <p className="text-sm">
            Loading mandis... the first load takes a few seconds while the
            government data is fetched.
          </p>
        </div>
      ) : mandis.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-white rounded-2xl border border-gray-100">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-medium">No mandis matched your search.</p>
          <p className="text-sm mt-1">
            Not every mandi reports every day, so a mandi you know may simply
            not be in today's data. Try a different name, or Reset to see all{" "}
            {totalMandis}.
          </p>
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
      className="block bg-white rounded-2xl shadow-soft border border-surface-300/60 p-5 hover:border-brand-green hover-lift animate-popIn"
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
        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
          {mandi.cropCount} crops
        </span>
        {mandi.latestDate && (
          <span className="text-ink-400">as of {mandi.latestDate}</span>
        )}
      </div>

      <p className="text-xs text-primary-700 font-semibold mt-3">
        View all crops &amp; prices →
      </p>
    </Link>
  );
}

export default Mandis;
