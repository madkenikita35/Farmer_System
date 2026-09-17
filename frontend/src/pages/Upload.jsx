// pages/Upload.jsx
// -----------------------------------------------------------------------
// This is the most important page in the app. It has THREE stages:
//
//   STAGE 1 ("idle")      - user picks/uploads a receipt image
//   STAGE 2 ("review")    - we show OCR's guesses in an EDITABLE form,
//                           so the user can fix anything OCR got wrong
//   STAGE 3 ("result")    - after saving, we show the comparison result
//                           (fair / underpaid / overpaid) with a chart
//
// We track which stage we're in using a single "stage" state variable.
// This pattern (a "stage" or "step" state) is a common, easy way to
// build multi-step forms as a fresher.
// -----------------------------------------------------------------------

import { useState } from "react";
import { scanReceiptImage, saveReceipt } from "../api/api";
import MandiTrendChart from "../components/MandiTrendChart";
import { useLanguage } from "../context/LanguageContext";

function Upload() {
  const { t } = useLanguage();

  const [stage, setStage] = useState("idle"); // "idle" | "review" | "result"
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form fields (filled by OCR, then editable by the user)
  // "date" defaults to today - the farmer can change it if the receipt
  // is from an earlier day. This is the date we match real Mandi API
  // prices against, so getting it right matters for an accurate verdict.
  const todayIso = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    imageName: "",
    rawOcrText: "",
    crop: "",
    mandiName: "",
    state: "",
    date: todayIso,
    quantityInQuintal: "",
    pricePerQuintal: "",
  });

  const [savedReceipt, setSavedReceipt] = useState(null);

  // What the scanner tells us ABOUT its own reading: how much it found,
  // which unit it detected, and any assumptions it had to make. We keep
  // this separate from `form` because it's information to display, not
  // data to submit.
  const [scanInfo, setScanInfo] = useState(null);

  // --- Handlers ---

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function handleScan() {
    if (!imageFile) {
      setErrorMessage(t("up_err_choose_image"));
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await scanReceiptImage(imageFile);
      const data = response.data;

      // Pre-fill the form with whatever OCR managed to guess.
      // Anything OCR couldn't find is left blank for manual entry.
      setForm({
        imageName: data.imageName || "",
        rawOcrText: data.rawOcrText || "",
        crop: data.crop || "",
        mandiName: data.mandiName || "",
        state: data.state || "",
        // If OCR found a date on the slip, use it - otherwise keep today.
        date: data.date || todayIso,
        quantityInQuintal: data.quantityInQuintal || "",
        pricePerQuintal: data.pricePerQuintal || "",
      });

      // Keep the scanner's own report on how well it did, so we can be
      // honest with the farmer about which fields to double-check.
      setScanInfo({
        quality: data.scanQuality,
        fieldsFound: data.fieldsFound,
        notes: data.scanNotes || [],
        detectedUnit: data.detectedUnit,
        detectedQuantity: data.detectedQuantity,
        totalAmount: data.totalAmount,
        priceSource: data.priceSource,
      });

      setStage("review");
    } catch (error) {
      console.error(error);
      setErrorMessage(t("up_err_scan"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.crop || !form.pricePerQuintal || !form.quantityInQuintal) {
      setErrorMessage(t("up_err_required"));
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await saveReceipt(form);
      setSavedReceipt(response.data.receipt);
      setStage("result");
    } catch (error) {
      console.error(error);
      setErrorMessage(t("up_err_save"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleStartOver() {
    setStage("idle");
    setImageFile(null);
    setImagePreviewUrl(null);
    setSavedReceipt(null);
    setScanInfo(null);
    setForm({
      imageName: "",
      rawOcrText: "",
      crop: "",
      mandiName: "",
      state: "",
      date: todayIso,
      quantityInQuintal: "",
      pricePerQuintal: "",
    });
  }

  // --- Render ---

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fadeIn">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">{t("up_title")}</h1>
      <p className="text-sm text-ink-500 mb-6">{t("up_subtitle")}</p>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
          {errorMessage}
        </div>
      )}

      {/* ---------- STAGE 1: choose + scan image ---------- */}
      {stage === "idle" && (
        <div className="bg-white rounded-2xl shadow-soft p-8 border border-surface-300/60">
          <label className="block border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-brand-green transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt={t("up_preview_alt")} className="max-h-64 mx-auto rounded-lg" />
            ) : (
              <>
                <div className="text-4xl mb-2">📷</div>
                <p className="text-ink-600">{t("up_choose_photo")}</p>
              </>
            )}
          </label>

          <button
            onClick={handleScan}
            disabled={isLoading}
            className="mt-6 w-full bg-primary-gradient text-white font-semibold py-3.5 rounded-2xl shadow-soft hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isLoading ? t("up_reading") : `🔍 ${t("up_scan_btn")}`}
          </button>
        </div>
      )}

      {/* ---------- STAGE 2: review / edit OCR results ---------- */}
      {stage === "review" && (
        <div className="bg-white rounded-2xl shadow-soft p-8 border border-surface-300/60">
          {/* How well did the scan go? Being upfront about this is more
              useful than a generic "check the values" line - it tells
              the farmer whether to skim or to look carefully. */}
          {scanInfo && <ScanQualityBanner scanInfo={scanInfo} />}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t("up_label_crop")} name="crop" value={form.crop} onChange={handleFormChange} placeholder={t("up_placeholder_crop")} />
            <Field label={t("up_label_mandi")} name="mandiName" value={form.mandiName} onChange={handleFormChange} placeholder={t("up_placeholder_mandi")} />
            <Field label={t("up_label_state")} name="state" value={form.state} onChange={handleFormChange} placeholder={t("cr_placeholder_state")} />
            <Field label={t("up_label_sale_date")} name="date" type="date" value={form.date} onChange={handleFormChange} />
            <Field
              label={t("up_label_quantity")}
              name="quantityInQuintal"
              type="number"
              value={form.quantityInQuintal}
              onChange={handleFormChange}
              placeholder={t("up_placeholder_quantity")}
              // Show what was actually printed on the receipt, e.g.
              // "read as 13,400 kg from the receipt" - so the farmer can
              // check our conversion rather than just trusting it.
              hint={
                scanInfo?.detectedQuantity && scanInfo?.detectedUnit
                  ? t("up_hint_quantity", {
                      quantity: scanInfo.detectedQuantity.toLocaleString("en-IN"),
                      unit: scanInfo.detectedUnit,
                    })
                  : null
              }
            />
            <Field
              label={t("up_label_price")}
              name="pricePerQuintal"
              type="number"
              value={form.pricePerQuintal}
              onChange={handleFormChange}
              placeholder={t("up_placeholder_price")}
              hint={
                scanInfo?.priceSource === "calculated from the total" && scanInfo?.totalAmount
                  ? t("up_hint_price_total", {
                      total: scanInfo.totalAmount.toLocaleString("en-IN"),
                    })
                  : scanInfo?.priceSource === "printed on the receipt"
                  ? t("up_hint_price_printed")
                  : null
              }
            />
          </div>

          <details className="mt-4">
            <summary className="text-sm text-primary-700 cursor-pointer">
              {t("up_raw_text")}
            </summary>
            <pre className="text-xs bg-gray-50 p-3 rounded-lg mt-2 whitespace-pre-wrap">
              {form.rawOcrText || t("up_no_text")}
            </pre>
          </details>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleStartOver}
              className="flex-1 border border-gray-300 text-ink-600 font-semibold py-3 rounded-xl hover:bg-gray-50"
            >
              {t("up_start_over")}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-primary-gradient text-white font-semibold py-3.5 rounded-2xl shadow-soft hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {isLoading ? t("up_comparing") : `✅ ${t("up_save_compare")}`}
            </button>
          </div>
        </div>
      )}

      {/* ---------- STAGE 3: show comparison result ---------- */}
      {stage === "result" && savedReceipt && (
        <ResultView receipt={savedReceipt} onStartOver={handleStartOver} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// A short, honest summary of how the scan went, shown above the form.
//
// Why bother? Because "we read 6 of 6 fields" and "we read 2 of 6, and
// we guessed the unit" call for very different amounts of checking from
// the farmer, and only the app knows which happened.
// ---------------------------------------------------------------------
function ScanQualityBanner({ scanInfo }) {
  const { t } = useLanguage();

  const styles = {
    good: { box: "bg-green-50 border-green-200 text-green-800", icon: "✅", titleKey: "up_scan_good" },
    partial: { box: "bg-amber-50 border-amber-200 text-amber-900", icon: "⚠️", titleKey: "up_scan_partial" },
    poor: { box: "bg-red-50 border-red-200 text-red-800", icon: "❗", titleKey: "up_scan_poor" },
    failed: { box: "bg-red-50 border-red-200 text-red-800", icon: "❌", titleKey: "up_scan_failed" },
  }[scanInfo.quality] || {
    box: "bg-gray-50 border-gray-200 text-gray-700",
    icon: "ℹ️",
    titleKey: "up_scan_complete",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 mb-5 text-sm ${styles.box}`}>
      <p className="font-semibold mb-1">
        {styles.icon}{" "}
        {t("up_scan_fields", {
          title: t(styles.titleKey),
          found: scanInfo.fieldsFound,
        })}
      </p>

      <p className="opacity-80">
        {scanInfo.quality === "good" ? t("up_scan_glance") : t("up_scan_check")}
      </p>

      {/* Anything the scanner had to assume, spelled out plainly. */}
      {scanInfo.notes && scanInfo.notes.length > 0 && (
        <ul className="mt-2 space-y-1 list-disc list-inside opacity-90">
          {scanInfo.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A small reusable labeled input field, so the form above stays tidy.
// `hint` is an optional line under the box explaining where the value
// came from - used for quantity and price, which are the two the
// scanner sometimes has to convert or calculate rather than just read.
function Field({ label, name, value, onChange, type = "text", placeholder, hint }) {
  // Highlight empty boxes in amber, so the fields still needing the
  // farmer's attention stand out at a glance.
  const isEmpty = value === "" || value === null || value === undefined;

  return (
    <div>
      <label className="block text-sm font-medium text-ink-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green ${
          isEmpty ? "border-amber-300 bg-amber-50/40" : "border-gray-300"
        }`}
      />
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

// The verdict banner + comparison chart shown after saving a receipt.
function ResultView({ receipt, onStartOver }) {
  const { t, tPlural } = useLanguage();

  // The verdict arrives from the backend in English and is stored that
  // way. We keep the stored value and translate only what is drawn.
  const VERDICT_KEYS = {
    "Fair Price": "verdict_fair_price",
    Underpaid: "verdict_underpaid",
    Overpaid: "verdict_overpaid",
    "No Data": "verdict_no_data",
  };

  const verdictColors = {
    "Fair Price": "bg-green-50 text-green-800 border-green-200",
    Underpaid: "bg-red-50 text-red-800 border-red-200",
    Overpaid: "bg-yellow-50 text-yellow-800 border-yellow-200",
    "No Data": "bg-gray-50 text-gray-700 border-gray-200",
  };

  // Tell the user plainly whether this verdict is based on REAL
  // government data or on sample/mock data (e.g. no API key set yet,
  // or the government API had nothing for this crop/date).
  const dataSourceInfo = {
    "real-exact-date": {
      label: `✅ ${t("up_src_real", {
        date: receipt.matchedMarketDate || t("up_matching_date"),
      })}`,
      className: "text-green-700",
    },
    "real-nearest-date": {
      label: `✅ ${t("up_src_real_nearest", {
        date: receipt.matchedMarketDate || "-",
      })}`,
      className: "text-green-700",
    },
    mock: {
      label: `⚠️ ${t("up_src_mock")}`,
      className: "text-amber-700",
    },
  }[receipt.dataSource] || null;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-8 border border-surface-300/60">
      <div className={`rounded-xl border p-5 mb-6 ${verdictColors[receipt.verdict]}`}>
        <p className="text-sm uppercase tracking-wide opacity-70 mb-1">{t("up_result")}</p>
        <p className="text-2xl font-bold mb-1">{t(VERDICT_KEYS[receipt.verdict] || "verdict_no_data")}</p>
        {receipt.blendedAveragePrice && (
          <p className="text-sm">
            {t("up_result_line", {
              price: receipt.pricePerQuintal,
              average: receipt.blendedAveragePrice,
            })}
            {receipt.priceDifferencePercent != null && (
              <> ({receipt.priceDifferencePercent > 0 ? "+" : ""}{receipt.priceDifferencePercent}%)</>
            )}
            .
          </p>
        )}

        {/* Breaking the blended number down into its two ingredients,
            so the farmer can see exactly what it's based on. */}
        <div className="flex flex-wrap gap-4 mt-2 text-xs">
          <span>
            🏛️{" "}
            {t("up_gov_avg_inline", {
              value: receipt.marketAveragePrice
                ? `₹${receipt.marketAveragePrice}`
                : t("common_no_data"),
            })}
          </span>
          <span>
            🧑‍🌾{" "}
            {t("up_farmer_avg_inline", {
              value: receipt.communityAveragePrice
                ? `₹${receipt.communityAveragePrice} (${tPlural(
                    "report_count",
                    receipt.communityReportCount
                  )})`
                : t("up_no_reports_yet"),
            })}
          </span>
        </div>

        {dataSourceInfo && (
          <p className={`text-xs mt-2 font-medium ${dataSourceInfo.className}`}>{dataSourceInfo.label}</p>
        )}
      </div>

      <h3 className="font-semibold text-ink-900 mb-2">
        {t("up_gov_price_across", {
          crop: receipt.crop,
          date: receipt.date || t("up_the_sale_date"),
        })}
      </h3>
      <MandiTrendChart data={receipt.comparisonData} />

      <button
        onClick={onStartOver}
        className="mt-6 w-full bg-brand-navy hover:opacity-90 text-white font-semibold py-3 rounded-xl"
      >
        {t("up_upload_another")}
      </button>
    </div>
  );
}

export default Upload;
