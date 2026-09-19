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
import { useLanguage } from "../context/LanguageContext";
import CropCategoryCharts from "../components/CropCategoryCharts";
import {
  FarmersIcon,
  MandiIcon,
  ReceiptIcon,
  SellIcon,
  WarnIcon,
  WeightIcon,
  ICON_MD,
  ICON_STROKE,
} from "../components/icons";

function MandiDetail() {
  const { t } = useLanguage();

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
        setErrorMessage(t("mdet_err_no_mandi"));
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
        setErrorMessage(t("mdet_err_load"));
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [mandiName, state]);

  if (isLoading) {
    return (
      <div className="text-center py-24 text-ink-500">
        <p className="text-sm">{t("mdet_loading", { mandi: mandiName })}</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-negative-50 text-negative-700 border border-negative-200 rounded-md px-4 py-3 text-sm">
          {errorMessage}
        </div>
        <Link to="/mandis" className="text-primary-700 font-medium text-sm mt-4 inline-block">
          {t("common_back_to_mandis")}
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
      <Link to="/mandis" className="text-primary-700 font-medium text-sm mb-4 inline-block">
        {t("common_back_to_mandis")}
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900 mb-1"><MandiIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {mandiName}</h1>
      <p className="text-ink-600 mb-6">{state}</p>

      {/* ---------- Summary cards ---------- */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={SellIcon} label={t("mdet_crops_listed")} value={totalCrops} tone="primary" />
        <StatCard icon={ReceiptIcon} label={t("mdet_receipts_from_farmers")} value={farmerReportCount} tone="accent" />
        <StatCard icon={WeightIcon} label={t("mdet_crops_comparable")} value={comparableCrops.length} />
      </div>

      {dataSource === "mock" && (
        <p className="text-xs text-warning-700 bg-warning-50 border border-warning-200 rounded-md px-4 py-2 mb-4">
          <WarnIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("mdet_mock_note")}
        </p>
      )}

      {/* ---------- Price charts, grouped by crop category ----------
           These sit ABOVE the table on purpose: the chart answers
           "what is worth selling here?" at a glance, and the table is
           there for the exact figures once you have spotted it. */}
      {crops.length > 0 && <CropCategoryCharts crops={crops} />}

      {/* ---------- The crop price table ---------- */}
      {crops.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-card rounded-lg border border-border">
          <p className="font-medium">{t("mdet_none_title")}</p>
          <p className="text-sm mt-1">{t("mdet_none_text")}</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-soft border border-surface-300/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-200/70 text-ink-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">{t("common_crop")}</th>
                  <th className="text-right px-4 py-3 font-medium">
                    <MandiIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("common_government")}
                    <span className="block text-[11px] font-normal text-ink-400">
                      {t("common_per_quintal")}
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    <FarmersIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("common_our_farmers")}
                    <span className="block text-[11px] font-normal text-ink-400">
                      {t("common_per_quintal")}
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">{t("common_difference")}</th>
                  <th className="text-right px-4 py-3 font-medium">{t("common_reports")}</th>
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

      <p className="text-xs text-ink-400 mt-4">{t("mdet_footnote")}</p>
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
    differenceColor = crop.differencePercent >= 0 ? "text-positive-600" : "text-negative-600";
  }

  return (
    <tr className="border-t border-surface-200 hover:bg-primary-50/40">
      <td className="px-4 py-3 font-medium text-ink-900">{crop.crop}</td>

      <td className="px-4 py-3 text-right">
        {crop.governmentPrice != null ? (
          <>
            <span className="font-medium">₹{crop.governmentPrice.toLocaleString("en-IN")}</span>
            {crop.governmentMinPrice != null && (
              <span className="block text-[11px] text-ink-400">
                ₹{crop.governmentMinPrice.toLocaleString("en-IN")} – ₹
                {crop.governmentMaxPrice.toLocaleString("en-IN")}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-300">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {crop.farmerPrice != null ? (
          <span className="font-medium text-warning-600">
            ₹{crop.farmerPrice.toLocaleString("en-IN")}
          </span>
        ) : (
          <span className="text-ink-300">—</span>
        )}
      </td>

      <td className={`px-4 py-3 text-right font-medium ${differenceColor}`}>
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
