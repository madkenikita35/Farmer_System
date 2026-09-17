// pages/Dashboard.jsx
// -----------------------------------------------------------------------
// The dashboard page: fetches summary stats + all receipts when the page
// loads (using useEffect), and renders stat cards, two charts, and a
// table - very similar in spirit to Gramhal's flask_admin dashboard.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";
import { getDashboardStats, getAllReceipts } from "../api/api";
import StatCard from "../components/StatCard";
import PriceComparisonChart from "../components/PriceComparisonChart";
import VerdictPieChart from "../components/VerdictPieChart";
import ReceiptTable from "../components/ReceiptTable";
import { useLanguage } from "../context/LanguageContext";

function Dashboard() {
  const { t } = useLanguage();

  const [stats, setStats] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect with an empty dependency array [] means:
  // "run this once, right after the component first appears on screen."
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, receiptsRes] = await Promise.all([
          getDashboardStats(),
          getAllReceipts(),
        ]);
        setStats(statsRes.data);
        setReceipts(receiptsRes.data);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <p className="text-center text-ink-500 py-16">{t("dash_loading")}</p>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-ink-900 mb-6">📊 {t("dash_title")}</h1>

      {/* ---- Row of summary stat cards ---- */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🧾" label={t("dash_total_receipts")} value={stats.totalReceipts} />
        <StatCard icon="✅" label={t("dash_fair_sales")} value={stats.fairCount} tone="primary" />
        <StatCard icon="⚠️" label={t("dash_underpaid_sales")} value={stats.underpaidCount} tone="under" />
        <StatCard
          icon="💰"
          label={t("dash_potential_loss")}
          value={stats.totalPotentialLoss.toLocaleString("en-IN")}
          tone="under"
        />
      </div>

      {/* ---- Data-quality transparency: how many receipts were
           compared against REAL government data vs mock/sample data ---- */}
      {stats.totalReceipts > 0 && (
        <div className="mb-8 bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-ink-900">{t("dash_data_quality")}</span>
          <span className="text-green-700">
            ✅ {t("dash_compared_real", { count: stats.realDataCount })}
          </span>
          <span className="text-amber-700">
            ⚠️ {t("dash_used_mock", { count: stats.mockDataCount })}
          </span>
          {stats.mockDataCount > 0 && (
            <span className="text-ink-500">{t("dash_add_key_hint")}</span>
          )}
        </div>
      )}

      {/* ---- Charts ---- */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60">
          <h2 className="font-semibold text-ink-900 mb-3">{t("dash_chart_price_title")}</h2>
          <PriceComparisonChart data={stats.priceComparisonChart} />
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60">
          <h2 className="font-semibold text-ink-900 mb-3">{t("dash_chart_verdict_title")}</h2>
          <VerdictPieChart data={stats.verdictBreakdown} />
        </div>
      </div>

      {/* ---- Table of all receipts ---- */}
      <div className="bg-white rounded-2xl shadow-soft p-6 border border-surface-300/60">
        <h2 className="font-semibold text-ink-900 mb-3">{t("dash_all_receipts")}</h2>
        <ReceiptTable receipts={receipts} />
      </div>
    </div>
  );
}

export default Dashboard;
