// pages/MandiDetail.jsx
// -----------------------------------------------------------------------
// You land here after clicking a mandi on the Mandis page.
//
// It shows EVERY crop sold in that one mandi, with BOTH prices side by
// side in the same row:
//
//   Crop     | Government Price | Our Farmers' Price | Difference
//   ---------+------------------+--------------------+-----------
//   Onion    | ₹2,400           | ₹2,150             | -₹250 (-10%)
//
// The "Difference" column is the interesting one: a consistently
// negative number means farmers at this mandi are being paid less than
// the official rate says they should be.
//
// WHERE DOES THE MANDI NAME COME FROM?
// From the URL, e.g. /mandis/view?mandi=Indore&state=Madhya%20Pradesh
// We read it with useSearchParams(), react-router's hook for reading
// the "?key=value" part of a URL.
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMandiCrops } from "../api/api";
import StatCard from "../components/StatCard";

function MandiDetail() {
  const [searchParams] = useSearchParams();
  const mandiName = searchParams.get("mandi") || "";
  const state = searchParams.get("state") || "";

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Re-run whenever the mandi in the URL changes, so clicking from one
  // mandi to another actually reloads the data. That's what the
  // [mandiName, state] "dependency array" at the bottom means.
  useEffect(() => {
    async function load() {
      if (!mandiName) {
        setErrorMessage("No mandi was specified in the URL.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await getMandiCrops(mandiName, state);
        setData(response.data);
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not load this mandi's crops. Is the backend running?");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [mandiName, state]);

  if (isLoading) {
    return (
      <div className="text-center py-24 text-ink-500">
        <div className="text-3xl mb-2 animate-pulse">🌾</div>
        <p className="text-sm">Loading crops for {mandiName}...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {errorMessage}
        </div>
        <Link to="/mandis" className="text-primary-700 font-semibold text-sm mt-4 inline-block">
          ← Back to all mandis
        </Link>
      </div>
    );
  }

  const { crops, totalCrops, farmerReportCount, dataSource } = data;

  // Of the crops listed, how many do we have BOTH prices for? Only
  // those rows can show a meaningful comparison.
  const comparableCrops = crops.filter(
    (c) => c.governmentPrice != null && c.farmerPrice != null
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fadeIn">
      <Link to="/mandis" className="text-primary-700 font-semibold text-sm mb-4 inline-block">
        ← Back to all mandis
      </Link>

      <h1 className="text-2xl font-bold text-ink-900 mb-1">🏛️ {mandiName}</h1>
      <p className="text-ink-600 mb-6">{state}</p>

      {/* ---------- Summary cards ---------- */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon="🌾" label="Crops Listed Here" value={totalCrops} tone="primary" />
        <StatCard icon="📝" label="Receipts From Our Farmers" value={farmerReportCount} tone="accent" />
        <StatCard icon="⚖️" label="Crops We Can Compare" value={comparableCrops.length} />
      </div>

      {dataSource === "mock" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">
          ⚠️ The government API returned nothing for this mandi - only farmer-reported
          prices (if any) are shown below.
        </p>
      )}

      {/* ---------- The crop price table ---------- */}
      {crops.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-white rounded-2xl border border-gray-100">
          <div className="text-3xl mb-2">🤷</div>
          <p className="font-medium">No crops reported for this mandi today.</p>
          <p className="text-sm mt-1">
            Mandis don't report every day. Try again tomorrow, or pick another mandi.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-200/70 text-ink-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Crop</th>
                  <th className="text-right px-4 py-3 font-semibold">
                    🏛️ Government
                    <span className="block text-[11px] font-normal text-ink-400">
                      ₹/quintal
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    🧑‍🌾 Our Farmers
                    <span className="block text-[11px] font-normal text-ink-400">
                      ₹/quintal
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">Difference</th>
                  <th className="text-right px-4 py-3 font-semibold">Reports</th>
                </tr>
              </thead>
              <tbody>
                {crops.map((crop) => (
                  <CropRow key={crop.crop} crop={crop} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-400 mt-4">
        "Government" is the modal price from data.gov.in's Agmarknet dataset.
        "Our Farmers" is the average of what farmers using this app reported
        being paid at this mandi. A dash means that source has no data for
        that crop.
      </p>
    </div>
  );
}

// One row of the table. Its own component mainly so the colour logic
// below doesn't clutter up the table markup above.
function CropRow({ crop }) {
  // Colour the difference: green if farmers got MORE than the official
  // rate, red if less, grey if we can't compare.
  let differenceColor = "text-ink-400";
  if (crop.differencePercent != null) {
    differenceColor = crop.differencePercent >= 0 ? "text-green-600" : "text-red-600";
  }

  return (
    <tr className="border-t border-surface-200 hover:bg-primary-50/40">
      <td className="px-4 py-3 font-medium text-ink-900">{crop.crop}</td>

      <td className="px-4 py-3 text-right">
        {crop.governmentPrice != null ? (
          <>
            <span className="font-semibold">₹{crop.governmentPrice.toLocaleString("en-IN")}</span>
            {crop.governmentMinPrice != null && (
              <span className="block text-[11px] text-ink-400">
                ₹{crop.governmentMinPrice.toLocaleString("en-IN")} – ₹
                {crop.governmentMaxPrice.toLocaleString("en-IN")}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {crop.farmerPrice != null ? (
          <span className="font-semibold text-amber-600">
            ₹{crop.farmerPrice.toLocaleString("en-IN")}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      <td className={`px-4 py-3 text-right font-semibold ${differenceColor}`}>
        {crop.differencePercent != null ? (
          <>
            {crop.difference > 0 ? "+" : ""}₹{Math.abs(crop.difference).toLocaleString("en-IN")}
            <span className="block text-[11px] font-normal">
              ({crop.differencePercent > 0 ? "+" : ""}
              {crop.differencePercent}%)
            </span>
          </>
        ) : (
          "—"
        )}
      </td>

      <td className="px-4 py-3 text-right text-ink-500">
        {crop.farmerReportCount > 0 ? crop.farmerReportCount : "—"}
      </td>
    </tr>
  );
}

export default MandiDetail;
