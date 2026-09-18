// components/CropCoverageCharts.jsx
// -----------------------------------------------------------------------
// The two charts on the Mandi Directory page:
//
//   1. Which crops are listed in the MOST mandis today
//   2. Which crops are listed in the FEWEST
//
// =======================================================================
// WHAT THE BARS ACTUALLY MEAN - PLEASE READ
// =======================================================================
// Each bar is "how many mandis reported a price for this crop today".
// It is NOT how much of the crop arrived.
//
// That distinction is easy to blur and matters. The government price
// resource publishes prices only - there is no quantity or tonnage
// field anywhere in it - so there is no honest way to draw an
// "arrivals" chart from this data. Agmarknet does publish an arrivals
// report, but it sits behind a CAPTCHA and cannot be fetched
// programmatically.
//
// Rather than quietly labelling a coverage chart "arrivals" and letting
// people read tonnage into it, the note under the heading says plainly
// what is being counted, and the backend sends the same caveat as
// `arrivalQuantityAvailable: false`.
//
// =======================================================================
// THE DESIGN
// =======================================================================
// Horizontal bars, because crop names like "Bhindi(Ladies Finger)" need
// a full line to stay readable.
//
// Each bar is coloured by its CROP CATEGORY rather than one flat colour
// for the whole chart. That was originally just to look better, but it
// turned out to carry real information: the "most listed" chart comes
// out almost entirely green, which tells you at a glance that the crops
// traded everywhere are vegetables - a fact the old single-colour
// version hid completely.
// -----------------------------------------------------------------------

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
  axisTick,
  gridStroke,
} from "./chartTheme";

function CropCoverageCharts({ coverage }) {
  const { t } = useLanguage();

  if (!coverage || !coverage.mostListed || coverage.mostListed.length === 0) {
    return null;
  }

  // Only the categories actually on screen go in the legend - listing
  // all eight when three are shown is noise.
  const categoriesShown = CATEGORY_ORDER.filter((category) =>
    [...coverage.mostListed, ...coverage.leastListed].some(
      (crop) => crop.category === category
    )
  );

  return (
    <div className="mb-8">
      <h2 className="font-semibold text-ink-900 mb-1">📊 {t("md_charts_title")}</h2>

      {/* The honest caveat, on screen and not just in the code. */}
      <p className="text-xs text-ink-500 mb-3">
        {t("md_charts_note", {
          mandis: coverage.totalMandis,
          crops: coverage.totalCrops,
        })}
      </p>

      {/* ---- Category legend ---- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
        {categoriesShown.map((category) => (
          <span
            key={category}
            className="flex items-center gap-1.5 text-xs text-ink-500"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: categoryColour(category) }}
            />
            {t(CATEGORY_LABEL_KEYS[category])}
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <CoverageChart
          title={t("md_most_listed")}
          subtitle={t("md_most_listed_sub")}
          icon="🌾"
          rows={coverage.mostListed}
          totalMandis={coverage.totalMandis}
        />
        <CoverageChart
          title={t("md_least_listed")}
          subtitle={t("md_least_listed_sub")}
          icon="🔍"
          rows={coverage.leastListed}
          totalMandis={coverage.totalMandis}
        />
      </div>
    </div>
  );
}

function CoverageChart({ title, subtitle, icon, rows, totalMandis }) {
  const data = rows.map((row) => ({
    name: row.crop,
    mandis: row.mandiCount,
    category: row.category,
  }));

  // About 32px a bar, so ten bars and twenty-five both look right.
  const chartHeight = Math.max(240, data.length * 32 + 30);

  return (
    <div className="bg-card rounded-2xl shadow-soft p-5 pr-3 border border-surface-300/60 hover-lift">
      <div className="flex items-start gap-2 mb-3 pl-1">
        <span className="text-lg leading-none mt-0.5">{icon}</span>
        <div>
          <h3 className="font-semibold text-ink-800 text-sm leading-tight">{title}</h3>
          <p className="text-xs text-ink-400">{subtitle}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        {/* layout="vertical" makes the BARS horizontal: values run along
            x, categories go down y. */}
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 46, left: 6, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke()} horizontal={false} />

          <XAxis
            type="number"
            tick={axisTick()}
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={axisTick()}
            interval={0}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            content={<CoverageTooltip totalMandis={totalMandis} />}
            cursor={{ fill: "rgba(148,163,184,.12)" }}
          />

          <Bar dataKey="mandis" radius={[0, 6, 6, 0]} barSize={16}>
            {/* One Cell per bar so each can take its category's colour. */}
            {data.map((row, index) => (
              <Cell key={index} fill={categoryColour(row.category)} />
            ))}

            <LabelList
              dataKey="mandis"
              position="right"
              style={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// The hover card: the crop, its category, and what share of today's
// mandis carry it - which is the number that gives the bar meaning.
// "308" means little on its own; "308 of 1,105" tells you it is common
// but not universal.
function CoverageTooltip({ active, payload, label, totalMandis }) {
  const { t } = useLanguage();

  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const share = totalMandis > 0 ? Math.round((row.mandis / totalMandis) * 100) : null;

  return (
    <div className="bg-white/97 backdrop-blur rounded-xl shadow-lg border border-surface-300 px-4 py-3 text-sm">
      <p className="font-semibold text-ink-900">{label}</p>

      <p className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5 mb-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: categoryColour(row.category) }}
        />
        {t(CATEGORY_LABEL_KEYS[row.category] || "cat_other")}
      </p>

      <p className="text-ink-700 font-semibold">
        {t("md_mandi_count", { count: row.mandis })}
      </p>

      {share != null && (
        <p className="text-xs text-ink-400">
          {t("md_mandi_share", { percent: share, total: totalMandis })}
        </p>
      )}
    </div>
  );
}

export default CropCoverageCharts;
