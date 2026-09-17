// components/PriceComparisonChart.jsx
// -----------------------------------------------------------------------
// A BAR CHART comparing, for each recent receipt, the price the farmer
// was actually paid vs. the market's average price for that crop.
// We use "recharts" - a popular, beginner-friendly charting library
// that works by wrapping simple components around your data array.
// -----------------------------------------------------------------------

import { useLanguage } from "../context/LanguageContext";
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

// `data` looks like:
// [{ name: "Wheat (12/5/2025)", pricePaid: 1800, marketAverage: 2000, communityAverage: 1900 }, ...]
function PriceComparisonChart({ data }) {
  const { t } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <p className="text-ink-500 text-sm">
        No receipts yet - upload one to see this chart fill up!
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-25}
          textAnchor="end"
          interval={0}
          height={60}
          tick={{ fontSize: 11 }}
        />
        <YAxis label={{ value: "₹ per Quintal", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="pricePaid" name={t("chart_price_you_got")} fill="#1F3B57" radius={[6, 6, 0, 0]} />
        <Bar dataKey="marketAverage" name={t("chart_government_avg")} fill="#2E7D32" radius={[6, 6, 0, 0]} />
        <Bar dataKey="communityAverage" name={t("chart_farmer_avg")} fill="#F59E0B" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default PriceComparisonChart;
