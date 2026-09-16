// components/ReceiptTable.jsx
// -----------------------------------------------------------------------
// A simple table listing every saved receipt, with a colour-coded
// "verdict" badge (Fair Price / Underpaid / Overpaid) so it's easy to
// scan at a glance.
// -----------------------------------------------------------------------

// Maps each verdict to a Tailwind colour class - keeping this in one
// place means the colours stay consistent everywhere we show a verdict.
const verdictStyles = {
  "Fair Price": "bg-green-100 text-green-800",
  Underpaid: "bg-red-100 text-red-800",
  Overpaid: "bg-yellow-100 text-yellow-800",
  "No Data": "bg-gray-100 text-ink-600",
};

// Short badge so it's obvious at a glance whether a row's comparison
// came from REAL government data or a mock/sample fallback.
const dataSourceStyles = {
  "real-exact-date": { label: "Real", className: "bg-green-100 text-green-800" },
  "real-nearest-date": { label: "Real (nearest date)", className: "bg-green-100 text-green-800" },
  mock: { label: "Mock", className: "bg-amber-100 text-amber-800" },
};

function ReceiptTable({ receipts }) {
  if (!receipts || receipts.length === 0) {
    return (
      <p className="text-ink-500 text-sm">
        No receipts uploaded yet. Go to "Upload Receipt" to add your first one!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 text-ink-500">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Crop</th>
            <th className="py-2 pr-4">Mandi</th>
            <th className="py-2 pr-4">Qty (Qtl)</th>
            <th className="py-2 pr-4">Price You Got</th>
            <th className="py-2 pr-4">Government Avg</th>
            <th className="py-2 pr-4">Farmer-Reported Avg</th>
            <th className="py-2 pr-4">Verdict</th>
            <th className="py-2 pr-4">Data Source</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => {
            const source = dataSourceStyles[r.dataSource] || dataSourceStyles.mock;
            return (
              <tr key={r._id} className="border-b border-surface-200 hover:bg-gray-50">
                <td className="py-2 pr-4">{r.date || new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-4 font-medium">{r.crop}</td>
                <td className="py-2 pr-4">{r.mandiName}</td>
                <td className="py-2 pr-4">{r.quantityInQuintal}</td>
                <td className="py-2 pr-4">₹{r.pricePerQuintal}</td>
                <td className="py-2 pr-4">{r.marketAveragePrice ? `₹${r.marketAveragePrice}` : "-"}</td>
                <td className="py-2 pr-4">
                  {r.communityAveragePrice ? `₹${r.communityAveragePrice} (${r.communityReportCount})` : "-"}
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${verdictStyles[r.verdict]}`}>
                    {r.verdict}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${source.className}`}>
                    {source.label}
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
