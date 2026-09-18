// components/CropCategoryCharts.jsx
// -----------------------------------------------------------------------
// The crop-price chart on a single mandi's page.
//
// ---------------------------------------------------------------------
// WHY ONE CHART PER CATEGORY
// ---------------------------------------------------------------------
// A busy mandi lists 70+ crops, and putting them all on one chart
// breaks it twice over:
//
//   1. The labels turn into an unreadable smear.
//   2. Worse, the SCALE. Cardamom sells for ~₹2,00,000 a quintal and
//      cabbage for ~₹800. On a shared y-axis the cardamom bar fills the
//      chart and every vegetable flattens into a line you cannot
//      compare at all.
//
// Splitting by category fixes both: a handful of bars each, and a scale
// suited to crops that cost roughly the same - so tomato against
// brinjal becomes a real comparison.
//
// ---------------------------------------------------------------------
// WHY TABS, AND WHY THE BARS LIE ON THEIR SIDE
// ---------------------------------------------------------------------
// The first version stacked all eight category charts down the page.
// Correct, but you had to scroll past seven charts to reach the one you
// wanted. Now the categories are TABS and you see one at a time - the
// same information, one click instead of a long scroll.
//
// And the bars run horizontally. Vertically, names like
// "Bhindi(Ladies Finger)" had to be rotated 40 degrees and still
// collided. Sideways, every crop gets a full readable line, and the
// price sits at the end of its own bar where you are already looking.
// -----------------------------------------------------------------------

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

import { useLanguage } from "../context/LanguageContext";
import {
  CATEGORY_ORDER,
  CATEGORY_LABEL_KEYS,
  categoryColour,
  formatRupees,
  AXIS_TICK,
  GRID_STROKE,
} from "./chartTheme";

// Above this many crops a category is trimmed, with a button to open it
// up. Twelve bars is about as much as fits on a phone before the chart
// becomes a scroll of its own.
const COLLAPSED_LIMIT = 12;

function CropCategoryCharts({ crops }) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Group the crops once, and only redo it if the crop list changes.
  const grouped = useMemo(() => {
    const buckets = {};

    for (const crop of crops || []) {
      // A crop with no price cannot be drawn, and a zero-height bar is
      // worse than no bar - it reads as "this costs nothing".
      if (crop.governmentPrice == null && crop.farmerPrice == null) continue;

      const category = crop.category || "other";
      if (!buckets[category]) buckets[category] = [];

      buckets[category].push({
        name: crop.crop,
        government: crop.governmentPrice,
        farmer: crop.farmerPrice,
        min: crop.governmentMinPrice,
        max: crop.governmentMaxPrice,
        reports: crop.farmerReportCount,
      });
    }

    // Dearest first inside each group - the eye starts at the top, so
    // the crops worth noticing should be there.
    for (const category of Object.keys(buckets)) {
      buckets[category].sort(
        (a, b) => (b.government ?? b.farmer ?? 0) - (a.government ?? a.farmer ?? 0)
      );
    }

    return buckets;
  }, [crops]);

  const categoriesPresent = CATEGORY_ORDER.filter(
    (category) => grouped[category] && grouped[category].length > 0
  );

  if (categoriesPresent.length === 0) return null;

  // Default to the first category that actually has crops. Kept in
  // state so switching tabs is instant, but derived here so we never
  // land on a tab that does not exist for this mandi.
  const active = categoriesPresent.includes(activeCategory)
    ? activeCategory
    : categoriesPresent[0];

  const allRows = grouped[active];
  const isTrimmed = !showAll && allRows.length > COLLAPSED_LIMIT;
  const rows = isTrimmed ? allRows.slice(0, COLLAPSED_LIMIT) : allRows;

  return (
    <div className="mb-8">
      <h2 className="font-semibold text-ink-900 mb-1">📊 {t("mdet_charts_title")}</h2>
      <p className="text-xs text-ink-500 mb-4">{t("mdet_charts_note")}</p>

      {/* ---- Category tabs ---- */}
      {/* Each tab carries its own colour, so the colour in the tab and
          the colour of the bars are obviously the same thing. */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categoriesPresent.map((category) => {
          const isActive = category === active;
          const colour = categoryColour(category);

          return (
            <button
              key={category}
              type="button"
              onClick={() => {
                setActiveCategory(category);
                setShowAll(false); // a fresh category starts trimmed
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium
                transition-all border ${
                  isActive
                    ? "text-white shadow-soft scale-[1.03] border-transparent"
                    : "bg-white text-ink-600 border-surface-300 hover:border-ink-300 hover:bg-surface-100"
                }`}
              style={isActive ? { backgroundColor: colour } : undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? "rgba(255,255,255,.85)" : colour }}
              />
              {t(CATEGORY_LABEL_KEYS[category])}
              <span
                className={`text-xs tabular-nums ${
                  isActive ? "text-white/80" : "text-ink-400"
                }`}
              >
                {grouped[category].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- The chart for the selected category ---- */}
      <CategoryChart
        rows={rows}
        colour={categoryColour(active)}
        categoryKey={active}
      />

      {/* ---- Trim / expand ---- */}
      {allRows.length > COLLAPSED_LIMIT && (
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => setShowAll((previous) => !previous)}
            className="text-sm font-semibold text-primary-700 hover:text-primary-800
              px-4 py-2 rounded-full hover:bg-primary-50 transition-colors"
          >
            {isTrimmed
              ? t("chart_show_all", { count: allRows.length })
              : t("chart_show_top", { count: COLLAPSED_LIMIT })}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// One category's chart.
// ---------------------------------------------------------------------
function CategoryChart({ rows, colour, categoryKey }) {
  const { t } = useLanguage();

  const hasFarmerPrices = rows.some((r) => r.farmer != null);

  // Roughly 38px per crop (46 when there are two bars stacked per
  // crop), so five crops and twelve crops both look right instead of
  // one being squashed and the other stretched.
  const rowHeight = hasFarmerPrices ? 46 : 34;
  const chartHeight = Math.max(200, rows.length * rowHeight + 50);

  // A unique gradient id per category - two <linearGradient> elements
  // sharing an id on one page would collide and one chart would silently
  // take the other's colours.
  const gradientId = `bar-gradient-${categoryKey}`;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 pr-3 border border-surface-300/60 animate-fadeIn">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 5, right: 78, left: 8, bottom: 5 }}
          barGap={2}
        >
          <defs>
            {/* A gentle left-to-right fade. Flat blocks of colour look
                unfinished at this size; the fade gives the bar some
                depth without distracting from its length. */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colour} stopOpacity={0.75} />
              <stop offset="100%" stopColor={colour} stopOpacity={1} />
            </linearGradient>
          </defs>

          {/* Vertical grid lines only. Horizontal ones would just box in
              each bar without helping you read its length. */}
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />

          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickFormatter={(value) => value.toLocaleString("en-IN")}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={AXIS_TICK}
            interval={0}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            content={<PriceTooltip />}
            cursor={{ fill: "rgba(148,163,184,.12)" }}
          />

          <Bar
            dataKey="government"
            name={t("common_government")}
            fill={`url(#${gradientId})`}
            radius={[0, 6, 6, 0]}
            barSize={hasFarmerPrices ? 14 : 18}
          >
            {/* The price printed at the end of its own bar. Saves
                hunting along the axis to read an approximate value. */}
            <LabelList
              dataKey="government"
              position="right"
              formatter={formatRupees}
              style={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
            />
          </Bar>

          {hasFarmerPrices && (
            <Bar
              dataKey="farmer"
              name={t("common_our_farmers")}
              radius={[0, 6, 6, 0]}
              barSize={14}
            >
              {rows.map((row, index) => (
                <Cell key={index} fill="#F59E0B" />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* A small hand-written legend rather than Recharts' own, which
          floats awkwardly and cannot be styled to match the app. */}
      <div className="flex items-center gap-4 text-xs text-ink-500 mt-1 pl-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colour }} />
          {t("common_government")}
        </span>
        {hasFarmerPrices && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            {t("common_our_farmers")}
          </span>
        )}
        <span className="ml-auto pr-2">{t("common_per_quintal")}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The hover card.
//
// Recharts' default tooltip is a plain white box listing raw keys. This
// one adds what the farmer actually wants next: the min-max range the
// mandi traded at, and how many farmers reported the crop.
// ---------------------------------------------------------------------
function PriceTooltip({ active, payload, label }) {
  const { t, tPlural } = useLanguage();

  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-white/97 backdrop-blur rounded-xl shadow-lg border border-surface-300 px-4 py-3 text-sm">
      <p className="font-semibold text-ink-900 mb-1.5">{label}</p>

      {row.government != null && (
        <p className="text-ink-700">
          <span className="text-ink-500">{t("common_government")}: </span>
          <span className="font-semibold">{formatRupees(row.government)}</span>
        </p>
      )}

      {/* The spread the mandi actually traded at. A wide gap means the
          quality of what you bring will matter a lot to your price. */}
      {row.min != null && row.max != null && row.min !== row.max && (
        <p className="text-xs text-ink-400 mt-0.5">
          {formatRupees(row.min)} – {formatRupees(row.max)}
        </p>
      )}

      {row.farmer != null && (
        <p className="text-amber-600 mt-1.5">
          <span className="text-ink-500">{t("common_our_farmers")}: </span>
          <span className="font-semibold">{formatRupees(row.farmer)}</span>
          {row.reports > 0 && (
            <span className="text-ink-400 text-xs">
              {" "}
              ({tPlural("report_count", row.reports)})
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export default CropCategoryCharts;
