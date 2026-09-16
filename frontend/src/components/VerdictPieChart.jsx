// components/VerdictPieChart.jsx
// -----------------------------------------------------------------------
// A PIE CHART showing what fraction of all uploaded receipts were
// "Fair Price", "Underpaid" or "Overpaid" - a quick visual health-check
// of how farmers using this app are generally being treated at mandis.
// -----------------------------------------------------------------------

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Colours are matched to the meaning: green = good, red = bad, amber = mixed
const COLORS = {
  "Fair Price": "#2E7D32",
  Underpaid: "#C62828",
  Overpaid: "#F9A825",
};

// `data` looks like: [{ name: "Fair Price", value: 5 }, { name: "Underpaid", value: 2 }, ...]
function VerdictPieChart({ data }) {
  const hasData = data && data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <p className="text-ink-500 text-sm">
        No receipts yet - upload one to see this chart fill up!
      </p>
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
          label={({ name, value }) => `${name}: ${value}`}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[entry.name] || "#999"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default VerdictPieChart;
