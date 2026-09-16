// components/MandiTrendChart.jsx
// -----------------------------------------------------------------------
// A LINE/BAR style chart showing how the price of ONE crop differs
// across DIFFERENT mandis right now - this directly answers the
// question: "which mandi is currently paying the best price for my
// crop?"
// -----------------------------------------------------------------------

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// `data` looks like: [{ market: "Pune Mandi", modalPrice: 1900, minPrice: 1750, maxPrice: 2050 }, ...]
function MandiTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-ink-500 text-sm">
        Comparison data will appear here once you save a receipt.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="market" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
        <YAxis label={{ value: "₹ per Quintal", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="minPrice" name="Min Price" fill="#90CAF9" radius={[6, 6, 0, 0]} />
        <Bar dataKey="modalPrice" name="Modal (Typical) Price" fill="#1F3B57" radius={[6, 6, 0, 0]} />
        <Bar dataKey="maxPrice" name="Max Price" fill="#2E7D32" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MandiTrendChart;
