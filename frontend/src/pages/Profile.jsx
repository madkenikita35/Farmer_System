// pages/Profile.jsx
// -----------------------------------------------------------------------
// Everything about "you", in one place.
//
// ---------------------------------------------------------------------
// WHY THIS PAGE EXISTS
// ---------------------------------------------------------------------
// The top bar used to carry the language picker, the theme swatch, the
// avatar, the full name and a logout button - five controls, on every
// page, competing with the thing the page was actually for.
//
// None of them are used often. You pick a language once. You log out at
// the end. So they moved here, and the header kept only the one thing
// that has to stay visible: WHO you are signed in as.
//
// The fields shown are the ones the user model actually has - name,
// email, phone, state, role, and when the account was made. Nothing is
// invented: see backend/models/User.js.
// -----------------------------------------------------------------------

import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme, ACCENTS } from "../context/ThemeContext";
import {
  UserIcon,
  LogoutIcon,
  LanguageIcon,
  ThemeIcon,
  ReceiptIcon,
  ArrowRightIcon,
  AdminIcon,
  ICON_MD,
  ICON_SM,
  ICON_STROKE,
} from "../components/icons";

// The accent swatches, same two colours the header used to offer.
const SWATCHES = { green: "#3A6B50", earth: "#775C44" };

function Profile() {
  const { currentUser, logout } = useAuth();
  const { t, language, setLanguage, languages, canChangeLanguage } = useLanguage();
  const { accent, setAccent } = useTheme();

  async function handleLogout() {
    await logout();
    // No navigate() here: logging out flips isLoggedIn, and the route
    // guard sends them onward by itself. Doing both races the two.
  }

  // Only the fields that exist on the user model. An empty phone or
  // state shows a dash rather than disappearing, so the row still tells
  // you the field is there and unfilled.
  const details = [
    { label: t("profile_name"), value: currentUser?.name },
    { label: t("profile_email"), value: currentUser?.email },
    { label: t("profile_phone"), value: currentUser?.phone },
    { label: t("profile_state"), value: currentUser?.state },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fadeIn">
      {/* ---------- Who ---------- */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="grid place-items-center w-14 h-14 rounded-md bg-primary-50
            text-primary-700 text-lg font-semibold shrink-0"
        >
          {currentUser?.name?.charAt(0).toUpperCase() || "?"}
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink-900 truncate">
            {currentUser?.name}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-ink-500">
            {currentUser?.role === "admin" ? (
              <>
                <AdminIcon size={ICON_SM} strokeWidth={ICON_STROKE} />
                {t("profile_role_admin")}
              </>
            ) : (
              <>
                <UserIcon size={ICON_SM} strokeWidth={ICON_STROKE} />
                {t("profile_role_farmer")}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ---------- Account details ---------- */}
      <Section title={t("profile_details")}>
        <dl className="divide-y divide-surface-200">
          {details.map((row) => (
            <div key={row.label} className="flex items-baseline gap-4 py-2.5">
              <dt className="w-32 shrink-0 text-sm text-ink-500">{row.label}</dt>
              <dd className="text-sm text-ink-900 min-w-0 break-words">
                {row.value || <span className="text-ink-400">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ---------- Language ---------- */}
      {/* Moved out of the header. It is a once-ever choice that was
          taking permanent space next to the page title. */}
      {canChangeLanguage && (
        <Section title={t("profile_language")} Icon={LanguageIcon}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full sm:w-64 border border-ink-200 rounded-md px-3 py-2 bg-card
              text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>
        </Section>
      )}

      {/* ---------- Appearance ---------- */}
      <Section title={t("theme_colour")} Icon={ThemeIcon}>
        <div className="flex gap-2">
          {ACCENTS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setAccent(name)}
              aria-pressed={name === accent}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm
                transition-colors ${
                  name === accent
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-surface-300 text-ink-600 hover:bg-surface-100"
                }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: SWATCHES[name] }}
              />
              {t(name === "green" ? "theme_green" : "theme_earth")}
            </button>
          ))}
        </div>
      </Section>

      {/* ---------- Their own data ---------- */}
      <Section title={t("profile_my_data")} Icon={ReceiptIcon}>
        <Link
          to="/dashboard"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-md
            border border-surface-300 hover:bg-surface-100 transition-colors"
        >
          <span className="text-sm text-ink-900">{t("profile_my_receipts")}</span>
          <ArrowRightIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="text-ink-400" />
        </Link>
      </Section>

      {/* ---------- Out ---------- */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2.5 rounded-md border
          border-negative-200 text-negative-700 text-sm font-medium
          hover:bg-negative-50 transition-colors"
      >
        <LogoutIcon size={ICON_MD} strokeWidth={ICON_STROKE} />
        {t("nav_logout")}
      </button>
    </div>
  );
}

// A titled block. Plain function rather than a shared component because
// it is four lines and used only here.
function Section({ title, Icon, children }) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase
        tracking-[0.1em] text-ink-400 mb-3">
        {Icon && <Icon size={ICON_SM} strokeWidth={ICON_STROKE} />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default Profile;
