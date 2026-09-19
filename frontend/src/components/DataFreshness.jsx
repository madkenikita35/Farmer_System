// components/DataFreshness.jsx
// -----------------------------------------------------------------------
// The small line under a price table or chart that says when the numbers
// arrived.
//
// ---------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------
// Prices come from other people's APIs, and they do not arrive all at
// once - mandis report through the day. So a farmer who checks onion at
// 9am and again at 4pm sees two different numbers for the same crop on
// the same date, and concludes the app is broken.
//
// It is not broken; the feed was still filling up. One line of text is
// the difference between "this app is unreliable" and "the market is
// still reporting".
//
// ---------------------------------------------------------------------
// TWO DIFFERENT SENTENCES
// ---------------------------------------------------------------------
// The date you are LOOKING AT and the moment the data ARRIVED are not
// the same thing, and confusing them is its own bug. So:
//
//   no date given     "Data last updated: 19-09-2026 at 20:09"
//   a past date given "Showing data for 15-08-2026 - last synced
//                      19-09-2026 at 20:09"
//
// Pass `forDate` whenever the user picked a date that is not today.
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";

import { getSyncStatus } from "../api/api";
import { useLanguage } from "../context/LanguageContext";

// The timestamp is fetched once per page and then shared, because five
// components asking for it on one screen would be five identical
// requests. A module-level promise is the smallest thing that works:
// whoever asks first starts the request, everyone else awaits the same
// one.
let pending = null;
let cached = null;
let cachedAt = 0;
const CACHE_MS = 60 * 1000;

function loadSyncStatus() {
  const fresh = cached && Date.now() - cachedAt < CACHE_MS;
  if (fresh) return Promise.resolve(cached);
  if (pending) return pending;

  pending = getSyncStatus()
    .then((response) => {
      cached = response.data;
      cachedAt = Date.now();
      return cached;
    })
    .catch(() => {
      // A missing timestamp is not worth an error on screen - the page
      // simply shows no label. Cached as null so we do not retry on
      // every render.
      cached = null;
      cachedAt = Date.now();
      return null;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/**
 * "19-09-2026 at 20:09" - the format asked for, in the user's own time
 * zone, 24-hour, day first.
 *
 * Built by hand rather than with toLocaleString() because that would
 * follow the browser's locale: an en-US browser would render 09-19-2026
 * and a 12-hour clock, so the same screen would read differently for
 * two people looking at the same data.
 */
function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (n) => String(n).padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}-${month}-${year} at ${hours}:${minutes}`;
}

/** "15-08-2026" from an ISO date, for the "showing data for" half. */
function formatDay(iso) {
  if (!iso) return null;
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function DataFreshness({ source, forDate, className = "" }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState(cached);

  useEffect(() => {
    let cancelled = false;
    loadSyncStatus().then((data) => {
      if (!cancelled) setStatus(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  // A page can name the feed it actually draws on, so the Price Trends
  // page reports CEDA's clock rather than the government feed's.
  const stamp = source
    ? status.sources?.[source]?.lastSyncedAt
    : status.lastSyncedAt;

  const when = stamp ? formatWhen(stamp) : null;
  if (!when) return null;

  // Only call it out when the date being viewed is genuinely not today -
  // otherwise every page would carry the longer sentence for no reason.
  const today = new Date().toISOString().slice(0, 10);
  const viewing = forDate && String(forDate).slice(0, 10);
  const isPast = viewing && viewing !== today;

  const text = isPast
    ? t("data_showing_for", { date: formatDay(viewing), when })
    : t("data_last_updated", { when });

  return (
    <p className={`text-xs text-ink-400 ${className}`} title={text}>
      {text}
    </p>
  );
}

export default DataFreshness;
