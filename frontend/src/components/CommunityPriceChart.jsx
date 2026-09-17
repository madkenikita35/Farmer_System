// components/CommunityPriceChart.jsx
// -----------------------------------------------------------------------
// A BAR CHART showing the average price OTHER FARMERS reported being
// paid for a crop, one bar per mandi. This is the "our data" side of
// the comparison - built entirely from receipts other people uploaded
// to this same app, not from any government source.
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
// [{ mandiName: "Pune Mandi", averagePrice: 1950, reportCount: 4 }, ...]
function CommunityPriceChart({ data }) {
  const { t } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <p className="text-ink-500 text-sm">
        No farmers have reported this crop yet. Be the first - upload your
        receipt and help others!
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mandiName" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
        <YAxis label={{ value: "₹ per Quintal", angle: -90, position: "insideLeft" }} />
        {/* The tooltip's formatter lets us show "(4 farmers reported)"
            next to the price, using the reportCount field on each bar's data. */}
        <Tooltip
          formatter={(value, name, props) => [
            `₹${value} (${props.payload.reportCount} farmer${props.payload.reportCount === 1 ? "" : "s"} reported)`,
            t("chart_average_price"),
          ]}
        />
        <Legend />
        <Bar dataKey="averagePrice" name={t("chart_farmer_avg")} fill="#F59E0B" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CommunityPriceChart;
