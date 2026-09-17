// components/VerdictPieChart.jsx
// -----------------------------------------------------------------------
// A PIE CHART showing what fraction of all uploaded receipts were
// "Fair Price", "Underpaid" or "Overpaid" - a quick visual health-check
// of how farmers using this app are generally being treated at mandis.
// -----------------------------------------------------------------------

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "../context/LanguageContext";

// Colours are matched to the meaning: green = good, red = bad, amber = mixed
const COLORS = {
  "Fair Price": "#2E7D32",
  Underpaid: "#C62828",
  Overpaid: "#F9A825",
};

// The slice names arrive from the backend in English ("Fair Price").
// They are DATA - the colour lookup above keys off them - so we keep
// them as they are and translate only the label the farmer reads.
const VERDICT_KEYS = {
  "Fair Price": "verdict_fair_price",
  Underpaid: "verdict_underpaid",
  Overpaid: "verdict_overpaid",
  "No Data": "verdict_no_data",
};

// `data` looks like: [{ name: "Fair Price", value: 5 }, { name: "Underpaid", value: 2 }, ...]
function VerdictPieChart({ data }) {
  const { t } = useLanguage();
  const hasData = data && data.some((d) => d.value > 0);

  if (!hasData) {
    return (
<p className="text-ink-500 text-sm">{t("chart_empty_comparison")}</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={110}
          label={({ name, value }) => `${t(VERDICT_KEYS[name] || name)}: ${value}`}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[entry.name] || "#999"} />
          ))}
        </Pie>
        {/* The tooltip and legend read the raw `name`, so they are
            given a formatter that runs the same translation. */}
        <Tooltip formatter={(value, name) => [value, t(VERDICT_KEYS[name] || name)]} />
        <Legend formatter={(name) => t(VERDICT_KEYS[name] || name)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default VerdictPieChart;
