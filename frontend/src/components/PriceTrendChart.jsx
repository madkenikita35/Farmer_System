// components/PriceTrendChart.jsx
// -----------------------------------------------------------------------
// The line graph on the crop trend page: date along the bottom, average
// price up the side.
//
// It owns its three states, because the caller should not have to
// re-implement them on every page:
//
//   LOADING   - a skeleton, so the layout does not jump when data lands
//   EMPTY     - nothing matched the filters
//   TOO SHORT - exactly one date matched
//
// ---------------------------------------------------------------------
// WHY "TOO SHORT" IS ITS OWN STATE, NOT JUST AN EMPTY CHART
// ---------------------------------------------------------------------
// A line needs at least two points. With one, Recharts draws a single
// dot and no line - which looks broken, and tells the farmer nothing
// about WHY.
//
// Right now this is the normal case rather than an edge case: every
// crop in the database has receipts from exactly one date, so every
// chart lands here. That is a data problem, not a bug, and the message
// says so plainly instead of leaving someone to conclude the feature
// is broken.
// -----------------------------------------------------------------------

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useLanguage } from "../context/LanguageContext";
import { AXIS_TICK, GRID_STROKE, formatRupees } from "./chartTheme";

const LINE_COLOUR = "#2E7D32";

/** "2026-09-17" -> "17 Sep" - short enough to fit along an axis. */
function shortDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function PriceTrendChart({ points, isLoading, crop }) {
  const { t } = useLanguage();

  // ---- 1. Loading ----
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60">
        <div className="animate-pulse">
          <div className="h-3 w-32 bg-surface-200 rounded mb-6" />
          {/* Bars of varying height read as "a chart is coming", which
              a plain grey block does not. */}
          <div className="flex items-end gap-2 h-56">
            {[45, 70, 35, 85, 55, 75, 40, 65, 50, 80].map((height, index) => (
              <div
                key={index}
                className="flex-1 bg-surface-200 rounded-t"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <p className="text-center text-sm text-ink-400 mt-4">{t("trend_loading")}</p>
      </div>
    );
  }

  const safePoints = points || [];

  // ---- 2. Nothing at all ----
  if (safePoints.length === 0) {
    return (
      <EmptyPanel
        icon="📭"
        title={t("trend_empty_title")}
        text={t("trend_empty_text")}
      />
    );
  }

  // ---- 3. One date: not enough for a line ----
  if (safePoints.length === 1) {
    const only = safePoints[0];
    return (
      <EmptyPanel
        icon="📈"
        title={t("trend_single_title")}
        text={t("trend_single_text")}
        detail={
          <div className="inline-flex flex-col items-center bg-primary-50 border border-primary-200 rounded-xl px-6 py-4 mt-4">
            <span className="text-xs text-ink-500">{only.date}</span>
            <span className="text-2xl font-bold text-primary-700">
              {formatRupees(only.averagePrice)}
            </span>
            <span className="text-xs text-ink-400">
              {pointSourceLabel(t, only)}
            </span>
          </div>
        }
      />
    );
  }

  // ---- 4. A real line ----
  const rows = safePoints.map((point) => ({
    ...point,
    label: shortDate(point.date),
  }));

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 pr-3 border border-surface-300/60">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={{ top: 10, right: 20, left: 4, bottom: 5 }}>
          <defs>
            <linearGradient id="trend-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#66BB6A" />
              <stop offset="100%" stopColor={LINE_COLOUR} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />

          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />

          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={72}
            // The unit belongs on the axis, not guessed at from the
            // numbers. ₹ grouping is Indian, so 11250 reads 11,250.
            tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
          />

          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#94a3b8", strokeWidth: 1 }} />

          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={() => t("trend_legend", { crop })}
          />

          <Line
            type="monotone"
            dataKey="averagePrice"
            name={crop}
            stroke="url(#trend-line)"
            strokeWidth={3}
            dot={{ r: 4, fill: LINE_COLOUR, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// The hover card: the exact date and price, plus how many receipts that
// average came from - one receipt and twenty receipts deserve very
// different amounts of trust.
function TrendTooltip({ active, payload }) {
  const { t } = useLanguage();

  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="bg-white/97 backdrop-blur rounded-xl shadow-lg border border-surface-300 px-4 py-3 text-sm">
      <p className="font-semibold text-ink-900 mb-1">{row.date}</p>
      <p className="text-primary-700 font-bold text-lg">{formatRupees(row.averagePrice)}</p>
      <p className="text-xs text-ink-400">{t("common_per_quintal")}</p>

      {row.minPrice != null && row.minPrice !== row.maxPrice && (
        <p className="text-xs text-ink-500 mt-1">
          {formatRupees(row.minPrice)} – {formatRupees(row.maxPrice)}
        </p>
      )}

      <p className="text-xs text-ink-400 mt-1">{pointSourceLabel(t, row)}</p>
    </div>
  );
}

/**
 * "from 12 markets" or "from 3 receipts", depending where the point
 * came from.
 *
 * The same chart now serves two sources: CEDA points carry
 * `marketCount` (how many mandis reported that day), while points built
 * from our own farmers' receipts carry `reportCount`. Rather than have
 * two nearly identical charts, the label adapts.
 */
function pointSourceLabel(t, point) {
  if (point.marketCount != null) {
    return t("trend_from_markets", { count: point.marketCount });
  }
  return t("trend_from_reports", { count: point.reportCount || 0 });
}

// Shared shell for the two "no chart" states, so they look deliberate
// rather than like an error.
function EmptyPanel({ icon, title, text, detail }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 py-14 px-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-ink-900 mb-1">{title}</p>
      <p className="text-sm text-ink-500 max-w-md mx-auto">{text}</p>
      {detail}
    </div>
  );
}

export default PriceTrendChart;
