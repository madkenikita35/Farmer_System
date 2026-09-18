// pages/CropsList.jsx
// -----------------------------------------------------------------------
// /crops - a card per crop, click one to see its price trend over time.
//
// ---------------------------------------------------------------------
// WHERE THE LIST COMES FROM
// ---------------------------------------------------------------------
// CEDA's /agmarknet/commodities - 453 crops, each with real price
// history behind it.
//
// This page used to read our own farmers' receipts instead, because
// data.gov.in is a single-day snapshot with no history to trend. CEDA
// solves that, so the list is now every crop that HAS a history rather
// than the handful our farmers happen to have uploaded.
//
// ---------------------------------------------------------------------
// 453 CARDS IS TOO MANY TO RENDER AT ONCE
// ---------------------------------------------------------------------
// Rendering all of them makes the page slow to paint and impossible to
// scan. So it shows a page-worth at a time with a "show more" button,
// and the search box filters the WHOLE list rather than the visible
// slice - otherwise searching would only find crops you had already
// scrolled to, which is the kind of bug users cannot report clearly.
// -----------------------------------------------------------------------

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

import { getCedaCrops } from "../api/api";
import CedaAttribution from "../components/CedaAttribution";
import { useLanguage } from "../context/LanguageContext";

// How many cards to add each time "show more" is pressed.
const PAGE_SIZE = 48;

// A rough picture per crop. Matched on the lowercased name containing
// the key, so "Onion Green" still gets the onion. Anything unmatched
// gets a seedling, which keeps the grid even.
const CROP_ICONS = [
  ["onion", "🧅"], ["tomato", "🍅"], ["potato", "🥔"], ["wheat", "🌾"],
  ["paddy", "🌾"], ["rice", "🍚"], ["maize", "🌽"], ["corn", "🌽"],
  ["cotton", "🧵"], ["banana", "🍌"], ["apple", "🍎"], ["mango", "🥭"],
  ["grape", "🍇"], ["orange", "🍊"], ["lemon", "🍋"], ["lime", "🍋"],
  ["carrot", "🥕"], ["cabbage", "🥬"], ["spinach", "🥬"], ["brinjal", "🍆"],
  ["cucumb", "🥒"], ["garlic", "🧄"], ["ginger", "🫚"], ["chilli", "🌶️"],
  ["chili", "🌶️"], ["coconut", "🥥"], ["groundnut", "🥜"], ["cashew", "🥜"],
  ["almond", "🥜"], ["soyabean", "🫘"], ["gram", "🫘"], ["dal", "🫘"],
  ["pea", "🫛"], ["bean", "🫘"], ["millet", "🌾"], ["jowar", "🌾"],
  ["bajra", "🌾"], ["ragi", "🌾"], ["barley", "🌾"], ["sugar", "🍬"],
  ["jaggery", "🍬"], ["gur", "🍬"], ["mushroom", "🍄"], ["papaya", "🫒"],
  ["pineapple", "🍍"], ["watermelon", "🍉"], ["melon", "🍈"],
  ["pomegranate", "🍎"], ["guava", "🍐"], ["pear", "🍐"], ["flower", "🌸"],
  ["rose", "🌹"], ["marigold", "🌼"], ["jasmine", "🌺"], ["turmeric", "🟡"],
  ["pepper", "🌶️"], ["cardamom", "🫚"], ["coriander", "🌿"], ["mint", "🌿"],
  ["methi", "🌿"], ["egg", "🥚"], ["fish", "🐟"], ["milk", "🥛"],
];

function iconFor(name) {
  const lower = String(name || "").toLowerCase();
  const hit = CROP_ICONS.find(([key]) => lower.includes(key));
  return hit ? hit[1] : "🌱";
}

function CropsList() {
  const { t } = useLanguage();

  const [crops, setCrops] = useState([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await getCedaCrops();
        setCrops(response.data.crops || []);
      } catch (error) {
        console.error("Could not load the crop list:", error);
        setErrorMessage(error.response?.data?.message || t("crops_err_load"));
      } finally {
        setIsLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter the FULL list, not the visible slice. useMemo so typing does
  // not re-filter 453 entries on every unrelated re-render.
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return crops;
    return crops.filter((c) => c.name.toLowerCase().includes(needle));
  }, [crops, search]);

  const visible = matches.slice(0, visibleCount);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">📈 {t("crops_title")}</h1>
      <p className="text-ink-600 mb-6">{t("crops_subtitle")}</p>

      {/* ---------- Search ---------- */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE); // a new search starts at the top
          }}
          placeholder={t("crops_search_placeholder")}
          className="w-full sm:w-80 border border-ink-200 rounded-xl px-3.5 py-2.5 bg-card
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
        />

        {!isLoading && (
          <span className="text-sm text-ink-500">
            {t("crops_showing", { shown: visible.length, total: matches.length })}
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-lg px-4 py-3 mb-6 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- The cards ---------- */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl border border-surface-300/60 p-5 h-24 animate-pulse"
            >
              <div className="h-4 w-24 bg-surface-200 rounded mb-3" />
              <div className="h-3 w-16 bg-surface-200 rounded" />
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-card rounded-2xl border border-surface-300/60">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-medium">{t("crops_none_title")}</p>
          <p className="text-sm mt-1 max-w-md mx-auto">{t("crops_none_text")}</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visible.map((crop) => (
              <Link
                key={crop.id}
                to={`/crops/${encodeURIComponent(crop.name)}`}
                className="group bg-card rounded-2xl shadow-soft border border-surface-300/60 p-4
                  hover:border-primary-400 hover-lift animate-popIn flex items-center gap-3"
              >
                <span className="text-2xl shrink-0 transition-transform group-hover:scale-110">
                  {iconFor(crop.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900 text-sm leading-tight truncate">
                    {crop.name}
                  </h3>
                  <p className="text-xs text-primary-700 font-medium">
                    {t("crops_view_trend")}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {visibleCount < matches.length && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-full font-semibold text-primary-700
                  border border-primary-300 hover:bg-primary-50 transition-colors"
              >
                {t("crops_show_more", {
                  count: Math.min(PAGE_SIZE, matches.length - visibleCount),
                })}
              </button>
            </div>
          )}
        </>
      )}

      {/* CEDA's terms require this wherever their data appears. */}
      <CedaAttribution className="mt-8" />
    </div>
  );
}

export default CropsList;
