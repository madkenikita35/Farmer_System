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

import PickList from "../components/PickList";
import DataFreshness from "../components/DataFreshness";
import { Link } from "react-router-dom";

import { getCedaCrops } from "../api/api";
import CedaAttribution from "../components/CedaAttribution";
import { useLanguage } from "../context/LanguageContext";

// How many cards to add each time "show more" is pressed.
const PAGE_SIZE = 48;

// A crop is identified by a MONOGRAM in its category colour, not by a
// picture.
//
// There was an emoji per crop here - a tomato, an onion, a mango, 63 of
// them. Two problems: the OS draws them, so the grid looked different on
// every device, and a wall of food cartoons is the single strongest
// "lifestyle app" signal in the whole product. There is also no
// line-icon set on earth with a hundred distinct vegetables, so mixing
// emoji in among the lucide icons was the only way to keep them.
//
// The monogram keeps what the emoji was actually FOR - telling one row
// apart from the next at a glance - and the category colour keeps the
// meaning the charts already teach ("green is vegetables").
function monogramFor(name) {
  const clean = String(name || "").trim();
  if (!clean) return "?";

  // Two initials for a multi-word crop ("Bengal Gram" -> BG), otherwise
  // the first two letters ("Onion" -> ON). Two characters fit a small
  // square at a readable size; three start to crowd.
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
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

  // Just the names, for the dropdown. Sorted so a crop is always in
  // the same place in the list however the API happened to order them.
  const cropNames = useMemo(
    () => crops.map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    [crops]
  );

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
      <h1 className="text-2xl font-semibold text-ink-900 mb-2"> {t("crops_title")}</h1>
      <p className="text-ink-600 mb-6">{t("crops_subtitle")}</p>
      {/* ---------- Search ---------- */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Was a text box searching 453 crop names. Picking is both
            faster and impossible to get wrong - and the native dropdown
            still supports type-ahead, so anyone who preferred typing
            can press "o" to jump to Onion. */}
        <div className="w-full sm:w-80">
          <PickList
            value={search}
            onChange={(name) => {
              setSearch(name);
              setVisibleCount(PAGE_SIZE); // a new choice starts at the top
            }}
            options={cropNames}
            placeholder={t("crops_all")}
            isLoading={isLoading}
          />
        </div>{!isLoading && (
          <span className="text-sm text-ink-500">{t("crops_showing", { shown: visible.length, total: matches.length })}
          </span>
        )}
      </div>{errorMessage && (
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-md px-4 py-3 mb-6 text-sm">{errorMessage}
        </div>
      )}

      <DataFreshness source="ceda" className="mb-4" />

      {/* ---------- The cards ---------- */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="bg-card rounded-lg border border-surface-300/60 p-5 h-24 animate-pulse">
              <div className="h-4 w-24 bg-surface-200 rounded mb-3" />
              <div className="h-3 w-16 bg-surface-200 rounded" />
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-card rounded-lg border border-surface-300/60">
          <p className="font-medium">{t("crops_none_title")}</p>
          <p className="text-sm mt-1 max-w-md mx-auto">{t("crops_none_text")}</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{visible.map((crop) => (
              <Link
                key={crop.id}
                to={`/crops/${encodeURIComponent(crop.name)}`}
                className="group bg-card rounded-lg shadow-soft border border-surface-300/60 p-4
                  hover:border-primary-400 hover-lift animate-popIn flex items-center gap-3">
                <span className="text-2xl shrink-0 transition-transform group-hover:scale-110">{monogramFor(crop.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-ink-900 text-sm leading-tight truncate">{crop.name}
                  </h3>
                  <p className="text-xs text-primary-700 font-medium">{t("crops_view_trend")}
                  </p>
                </div>
              </Link>
            ))}
          </div>{visibleCount < matches.length && (
            <div className="text-center mt-6">
              <button
                type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-full font-medium text-primary-700
                  border border-primary-300 hover:bg-primary-50 transition-colors">{t("crops_show_more", {
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
