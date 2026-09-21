// components/LocationPicker.jsx
// -----------------------------------------------------------------------
// Five ways to say where you are, all producing the same thing: one
// latitude and longitude.
//
//   GPS       - ask the browser
//   Town      - type a town or district (what the page had before)
//   Pincode   - 6 digits
//   Address   - address / post office / taluka / district
//   Lat-Long  - typed coordinates, for advanced users and testing
//
// ---------------------------------------------------------------------
// WHY THE RESOLVING HAPPENS ON THE SERVER
// ---------------------------------------------------------------------
// Everything except GPS goes to /api/location/resolve. That endpoint
// owns the India Post lookup, the Nominatim throttle and the
// district-coordinate table. Doing any of it here would mean a second
// copy of logic that already exists - and would put an API key-less but
// rate-limited service directly in the browser's hands, where we could
// not pace the calls.
//
// The parent gets a single `onResolved({ lat, lon, label, ... })`. It
// never needs to know which tab produced them.
// -----------------------------------------------------------------------

import { useState } from "react";

import { resolveLocation } from "../api/api";
import { useLanguage } from "../context/LanguageContext";
import {
  OkIcon,
  ICON_MD,
  ICON_STROKE,
  LocationIcon,
  MandiIcon,
  ReceiptIcon,
  RegionIcon,
  CountryIcon,
} from "./icons";

const METHODS = [
  { key: "gps", labelKey: "loc_method_gps", icon: LocationIcon },
  { key: "place", labelKey: "loc_method_place", icon: MandiIcon },
  { key: "pincode", labelKey: "loc_method_pincode", icon: ReceiptIcon },
  { key: "address", labelKey: "loc_method_address", icon: RegionIcon },
  { key: "coords", labelKey: "loc_method_coords", icon: CountryIcon },
];

const inputClass =
  "w-full border border-ink-200 rounded-md px-3.5 py-2.5 bg-card " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all";

function LocationPicker({ resolved, onResolved, onError, onDraft }) {
  const { t } = useLanguage();

  const [method, setMethod] = useState("gps");

  // Changing tab changes which typed value counts, so the parent is
  // told about that too - see setField() below.
  function changeMethod(next) {
    setMethod(next);
    if (onDraft) onDraft({ method: next, fields });
  }
  const [isBusy, setIsBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  // One bag of fields for every method - simpler than five useStates,
  // and switching tabs keeps what you already typed.
  const [fields, setFields] = useState({
    place: "",
    pincode: "",
    address: "",
    postOffice: "",
    taluka: "",
    district: "",
    lat: "",
    lon: "",
  });

  function setField(name, value) {
    setFields((prev) => {
      const next = { ...prev, [name]: value };

      // Tell the parent what has been TYPED, not just what has been
      // resolved.
      //
      // Before this, the only way out of this component was
      // onResolved() - which fires when the little "Find" button is
      // pressed. So someone who typed "pune" and went straight for
      // "Find Best Mandis" hit an error telling them to pick a
      // location, with the location sitting right there in the box.
      //
      // The parent can now send the raw text to the backend, which
      // already knows how to geocode a place name.
      if (onDraft) onDraft({ method, fields: next });

      return next;
    });
  }

  function fail(message) {
    setLocalError(message);
    if (onError) onError(message);
  }

  // ---- GPS: the browser, not our server ----
  function useMyLocation() {
    if (!navigator.geolocation) {
      fail(t("nm_err_no_geolocation"));
      return;
    }

    setIsBusy(true);
    setLocalError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsBusy(false);
        onResolved({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          label: t("nm_using_location"),
          method: "gps",
        });
      },
      (error) => {
        setIsBusy(false);
        // Say WHICH problem it was - "allow it" and "type your town"// are different instructions.
        const messages = {
          1: t("nm_err_denied"),
          2: t("nm_err_unavailable"),
          3: t("nm_err_timeout"),
        };
        fail(messages[error.code] || t("nm_err_generic_location"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // ---- Everything else: ask the server ----
  async function resolveOnServer() {
    setIsBusy(true);
    setLocalError("");

    try {
      const response = await resolveLocation({ method, ...fields });
      onResolved({ ...response.data, method });
    } catch (error) {
      // The backend's messages are written for a farmer to read
      // ("A pincode is 6 digits and does not start with 0"), so we show
      // them rather than replacing them with something generic.
      fail(error.response?.data?.message || t("loc_err_resolve"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="border-t border-surface-200 pt-4">
      <p className="text-sm font-medium text-ink-600 mb-2">{t("nm_your_location")}</p>
      {/* ---- Method tabs ---- */}
      <div className="flex flex-wrap gap-2 mb-3">{METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              changeMethod(m.key);
              setLocalError("");
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
              method === m.key
                ? "bg-primary-600 text-primary-foreground border-transparent shadow-sm": "bg-card text-ink-600 border-surface-300 hover:border-ink-300 hover:bg-surface-100"}`}
          >
            {m.icon && (
              <m.icon
                size={ICON_MD}
                strokeWidth={ICON_STROKE}
                className="inline-block mr-1.5 align-[-2px]"
                aria-hidden="true"
              />
            )}
            {t(m.labelKey)}
          </button>
        ))}
      </div>
      {/* ---- The chosen method's inputs ---- */}
      {method === "gps" && (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={isBusy}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 ${
            resolved?.method === "gps"? "bg-positive-100 text-positive-800 border border-positive-300": "bg-secondary text-secondary-foreground hover:opacity-90"}`}
        >{isBusy
            ? ` ${t("nm_finding_you")}`
            : resolved?.method === "gps"? `${t("nm_using_location")}`
            : `${t("nm_use_my_location")}`}
        </button>
      )}

      {method === "place" && (
        <div className="flex gap-2">
          <input
            type="text"
          value={fields.place}
            onChange={(e) => setField("place", e.target.value)}
            placeholder={t("nm_place_placeholder")}
            className={inputClass}
          />
          <ResolveButton onClick={resolveOnServer} isBusy={isBusy} />
        </div>
      )}

      {method === "pincode" && (
        <div className="flex gap-2">
          <input
            type="text"
          inputMode="numeric"// 6 digits is the whole format, so the box says so rather
            // than letting someone paste an essay and get a 400.
            maxLength={6}
            value={fields.pincode}
            onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, ""))}
            placeholder={t("loc_pincode_placeholder")}
            className={`${inputClass} sm:max-w-[200px] tracking-widest`}
          />
          <ResolveButton onClick={resolveOnServer} isBusy={isBusy} />
        </div>
      )}

      {method === "address" && (
        <div className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              type="text"
          value={fields.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder={t("loc_address_placeholder")}
              className={inputClass}
            />
            <input
              type="text"
          value={fields.postOffice}
              onChange={(e) => setField("postOffice", e.target.value)}
              placeholder={t("loc_post_office_placeholder")}
              className={inputClass}
            />
            <input
              type="text"
          value={fields.taluka}
              onChange={(e) => setField("taluka", e.target.value)}
              placeholder={t("loc_taluka_placeholder")}
              className={inputClass}
            />
            <input
              type="text"
          value={fields.district}
              onChange={(e) => setField("district", e.target.value)}
              placeholder={t("loc_district_placeholder")}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end">
            <ResolveButton onClick={resolveOnServer} isBusy={isBusy} />
          </div>
          <p className="text-xs text-ink-400">{t("loc_address_hint")}</p>
        </div>
      )}

      {method === "coords" && (
        <div className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              type="number"
          step="any"
          value={fields.lat}
              onChange={(e) => setField("lat", e.target.value)}
              placeholder={t("loc_lat_placeholder")}
              className={inputClass}
            />
            <input
              type="number"
          step="any"
          value={fields.lon}
              onChange={(e) => setField("lon", e.target.value)}
              placeholder={t("loc_lon_placeholder")}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end">
            <ResolveButton onClick={resolveOnServer} isBusy={isBusy} />
          </div>
        </div>
      )}

      {/* ---- What we settled on ---- */}
      {resolved && !localError && (
        <p className="text-xs text-positive-700 mt-2">
          <OkIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("loc_using", { label: resolved.label || `${resolved.lat}, ${resolved.lon}` })}
          {/* A pincode gets you to a district, not a doorstep. Saying so
              stops the distances below looking more precise than they
              are. */}
          {resolved.accuracy === "district" && resolved.method === "pincode" && (
            <span className="text-ink-400"> · {t("loc_district_accuracy")}</span>
          )}
          {resolved.broadened && (
            <span className="text-warning-600"> · {t("loc_broadened")}</span>
          )}
        </p>
      )}

      {localError && <p className="text-xs text-negative-600 mt-2">{localError}</p>}
    </div>
  );
}

function ResolveButton({ onClick, isBusy }) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
          onClick={onClick}
      disabled={isBusy}
      className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium
        hover:opacity-90 disabled:opacity-50 shrink-0">{isBusy ? t("loc_finding") : t("loc_find")}
    </button>
  );
}

export default LocationPicker;
