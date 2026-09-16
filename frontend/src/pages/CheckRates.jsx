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

function CheckRates() {
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

  // Pulled out of the form handler so the effect below can call it too.
  async function runSearch(cropName) {
    if (!cropName.trim()) {
      setErrorMessage("Please enter a crop name, e.g. Wheat.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await compareMandiPrices(cropName.trim(), state.trim(), date);
      setResult(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not fetch prices. Make sure the backend server is running.");
    } finally {
      setIsLoading(false);
    }
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
      <h1 className="text-2xl font-bold text-ink-900 mb-2">🔍 Check Mandi Rates</h1>
      <p className="text-ink-600 mb-6">
        Before you sell, see what price your crop is fetching - both the
        official government rate and what other farmers nearby actually
        got paid.
      </p>

      {/* ---------- Search form ---------- */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60 grid sm:grid-cols-4 gap-4 mb-8"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-600 mb-1">Crop</label>
          <input
            type="text"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder="e.g. Wheat, Onion, Tomato"
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">State (optional)</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. Maharashtra"
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary-gradient text-white font-semibold px-6 py-3 rounded-2xl shadow-soft hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {isLoading ? "Searching..." : "🔍 Check Rates"}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
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
  const { government, community, bestMandi, worstMandi, priceGap, priceGapPercent, rankedMandis } =
    result;

  // A short, honest note about where the government numbers came from -
  // the same "real vs mock" idea shown on the Upload result screen.
  const govtSourceLabel = {
    "real-exact-date": `✅ Real government data for ${government.matchedDate}`,
    "real-nearest-date": `✅ Real government data (closest available date: ${government.matchedDate})`,
    mock: "⚠️ Sample/mock data (no MANDI_API_KEY set, or no real records found)",
  }[government.dataSource];

  return (
    <div>
      {/* ---- Top-level averages from each data source ---- */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon="🏛️"
          label="Government Average (₹/Quintal)"
          value={government.averagePrice ?? "-"}
          tone="primary"
        />
        <StatCard
          icon="🧑‍🌾"
          label="Farmer-Reported Average (₹/Quintal)"
          value={community.averagePrice ?? "-"}
          tone="accent"
        />
        <StatCard
          icon="📝"
          label="Farmer Reports Found"
          value={community.reportCount}
        />
      </div>

      {/* ---- WHERE SHOULD YOU SELL? The highest vs lowest mandi ---- */}
      {/* This is the most actionable thing on the page, so it sits
          right at the top, before any charts. The backend works out
          the ranking across BOTH data sources - see
          findBestAndWorstMandis() in backend/controllers/mandiController.js */}
      {bestMandi && worstMandi && (
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <MandiOfferCard
            title="Highest price right now"
            emoji="📈"
            offer={bestMandi}
            tone="good"
          />
          <MandiOfferCard
            title="Lowest price right now"
            emoji="📉"
            offer={worstMandi}
            tone="bad"
          />
        </div>
      )}

      {priceGap > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 text-sm text-amber-900">
          💡 That's a difference of <strong>₹{priceGap.toLocaleString("en-IN")}</strong> per
          quintal ({priceGapPercent}%) between the best and worst mandi. On 10 quintals
          that's <strong>₹{(priceGap * 10).toLocaleString("en-IN")}</strong> - worth
          checking before you load the truck.
        </div>
      )}

      <p className="text-xs text-ink-500 mb-6">{govtSourceLabel}</p>

      {/* ---- The full ranking, best to worst ---- */}
      {rankedMandis && rankedMandis.length > 2 && (
        <details className="bg-white rounded-2xl shadow-soft border border-surface-300/60 mb-6">
          {/* <details>/<summary> is plain HTML - it gives you a
              collapsible section with no JavaScript at all. */}
          <summary className="cursor-pointer px-6 py-4 font-semibold text-ink-900">
            📊 See all {rankedMandis.length} mandis ranked, best price first
          </summary>
          <div className="px-6 pb-5 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-ink-500 text-left">
                <tr>
                  <th className="py-2 font-semibold">#</th>
                  <th className="py-2 font-semibold">Mandi</th>
                  <th className="py-2 font-semibold">Source</th>
                  <th className="py-2 font-semibold text-right">₹/quintal</th>
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
        <div className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60">
          <h2 className="font-semibold text-ink-900 mb-3">🏛️ Government Mandi Prices</h2>
          <MandiTrendChart data={government.prices} />
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60">
          <h2 className="font-semibold text-ink-900 mb-3">🧑‍🌾 What Other Farmers Got Paid</h2>
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
  const styles =
    tone === "good"
      ? "bg-green-50 border-green-200 text-green-900"
      : "bg-red-50 border-red-200 text-red-900";

  const priceColor = tone === "good" ? "text-green-700" : "text-red-700";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
        {emoji} {title}
      </p>
      <p className="text-lg font-bold leading-tight">{offer.mandiName}</p>
      <p className="text-sm opacity-70 mb-2">{offer.state}</p>

      <p className={`text-3xl font-bold ${priceColor}`}>
        ₹{offer.price.toLocaleString("en-IN")}
        <span className="text-sm font-normal opacity-60"> /quintal</span>
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
  if (source === "government") {
    return (
      <span className="inline-block bg-white/70 text-xs px-2 py-1 rounded-full font-medium">
        🏛️ Government listed
      </span>
    );
  }

  return (
    <span className="inline-block bg-white/70 text-xs px-2 py-1 rounded-full font-medium">
      🧑‍🌾 {reportCount} farmer report{reportCount === 1 ? "" : "s"}
    </span>
  );
}

export default CheckRates;
