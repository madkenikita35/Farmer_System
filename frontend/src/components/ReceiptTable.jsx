// components/ReceiptTable.jsx
// -----------------------------------------------------------------------
// A simple table listing every saved receipt, with a colour-coded
// "verdict" badge (Fair Price / Underpaid / Overpaid) so it's easy to
// scan at a glance.
//
// ---------------------------------------------------------------------
// TRANSLATING THE VERDICT
// ---------------------------------------------------------------------
// `r.verdict` arrives from the backend as an English string - "Fair
// Price", "Underpaid" and so on. Those are DATA values, not display
// text: the database stores them, the charts group by them, and the
// admin pages filter on them. So we must NOT translate them at the
// source.
//
// Instead each English value maps to a translation KEY here, and the
// key is looked up in the farmer's language at the moment we draw it.
// The value travelling through the app stays English; only the pixels
// change. VERDICT_KEYS below is that map.
// -----------------------------------------------------------------------

import { useLanguage } from "../context/LanguageContext";

// Maps each verdict to a Tailwind colour class - keeping this in one
// place means the colours stay consistent everywhere we show a verdict.
const verdictStyles = {
  "Fair Price": "bg-positive-100 text-positive-800",
  Underpaid: "bg-negative-100 text-negative-800",
  Overpaid: "bg-yellow-100 text-yellow-800",
  "No Data": "bg-muted text-ink-600",
};

// English verdict (as stored) -> translation key (as shown).
const VERDICT_KEYS = {
  "Fair Price": "verdict_fair_price",
  Underpaid: "verdict_underpaid",
  Overpaid: "verdict_overpaid",
  "No Data": "verdict_no_data",
};

// Short badge so it's obvious at a glance whether a row's comparison
// came from REAL government data or a mock/sample fallback.
const dataSourceKeys = {
  "real-exact-date": { key: "src_real", className: "bg-positive-100 text-positive-800" },
  "real-nearest-date": { key: "src_real_nearest", className: "bg-positive-100 text-positive-800" },
  mock: { key: "src_mock", className: "bg-warning-100 text-warning-800" },
};

function ReceiptTable({ receipts }) {
  const { t, tPlural } = useLanguage();

  if (!receipts || receipts.length === 0) {
    return <p className="text-ink-500 text-sm">{t("rt_empty")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-border text-ink-500">
            <th className="py-2 pr-4">{t("common_date")}</th>
            <th className="py-2 pr-4">{t("common_crop")}</th>
            <th className="py-2 pr-4">{t("common_mandi")}</th>
            <th className="py-2 pr-4">{t("rt_qty")}</th>
            <th className="py-2 pr-4">{t("rt_price_you_got")}</th>
            <th className="py-2 pr-4">{t("rt_gov_avg")}</th>
            <th className="py-2 pr-4">{t("rt_farmer_avg")}</th>
            <th className="py-2 pr-4">{t("rt_verdict")}</th>
            <th className="py-2 pr-4">{t("rt_data_source")}</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => {
            const source = dataSourceKeys[r.dataSource] || dataSourceKeys.mock;
            return (
              <tr key={r._id} className="border-b border-surface-200 hover:bg-muted">
                <td className="py-2 pr-4">{r.date || new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-4 font-medium">{r.crop}</td>
                <td className="py-2 pr-4">{r.mandiName}</td>
                <td className="py-2 pr-4">{r.quantityInQuintal}</td>
                <td className="py-2 pr-4">₹{r.pricePerQuintal}</td>
                <td className="py-2 pr-4">{r.marketAveragePrice ? `₹${r.marketAveragePrice}` : "-"}</td>
                <td className="py-2 pr-4">
                  {r.communityAveragePrice
                    ? `₹${r.communityAveragePrice} (${tPlural("report_count", r.communityReportCount)})`
                    : "-"}
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${verdictStyles[r.verdict]}`}>
                    {t(VERDICT_KEYS[r.verdict] || "verdict_no_data")}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${source.className}`}>
                    {t(source.key)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ReceiptTable;
