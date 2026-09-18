// components/Navbar.jsx
// -----------------------------------------------------------------------
// The top navigation bar shown on every page.
//
// It shows THREE different menus depending on who you are:
//
//   1. Logged OUT  -> just the language picker + Log In / Sign Up.
//                     No app links at all, because there's nothing a
//                     logged-out visitor is allowed to open.
//
//   2. FARMER      -> Home, Upload, Check Rates, Near Me, Mandis,
//                     Dashboard. There is NO "admin" link here - the
//                     farmer site gives no hint an admin area exists.
//
//   3. ADMIN       -> Dashboard, Farmers, Activity, Mandis, and no
//                     language picker (the admin panel is English only).
//
// ---------------------------------------------------------------------
// WHAT THE DESIGN IS DOING
// ---------------------------------------------------------------------
// - It SHRINKS ON SCROLL. At the top of the page the bar is roomy and
//   welcoming; once you scroll it becomes compact, so it takes less of
//   the screen away from the content you came to read.
//
// - The active link is a solid white PILL, not just differently-coloured
//   text. On a phone held at arm's length a colour difference is easy to
//   miss - a filled shape is not.
//
// - Every link carries an ICON as well as a label. The app is translated
//   into eleven languages, and a farmer who reads slowly can navigate by
//   the icons alone.
//
// - The bar is GREEN for farmers and NAVY for admins, so which side of
//   the app you're on is obvious at a glance.
//
// All of this is presentation only. The pages themselves are guarded by
// ProtectedRoute, and the data behind them by the backend.
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { t, language, setLanguage, languages, canChangeLanguage } = useLanguage();
  const { currentUser, isAdmin, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // True once the page has been scrolled at all - drives the compact look.
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8);
    }
    // `passive: true` promises the browser we'll never call
    // preventDefault() here, so it can keep scrolling smoothly instead
    // of waiting to see what this handler does.
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // handle a page that loads already part-scrolled
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // ---- Which links to show, based on role ----
  // Built as an ARRAY so the desktop and mobile menus can't drift apart.
  let navLinks = [];

  if (isAdmin) {
    navLinks = [
      { to: "/admin", label: "Dashboard", icon: "📊", end: true },
      { to: "/admin/farmers", label: "Farmers", icon: "🧑‍🌾" },
      { to: "/admin/activity", label: "Activity", icon: "⚡" },
      { to: "/mandis", label: "Mandis", icon: "🏛️" },
    ];
  } else if (isLoggedIn) {
    navLinks = [
      { to: "/", label: t("nav_home"), icon: "🏠", end: true },
      { to: "/upload", label: t("nav_upload"), icon: "📤" },
      { to: "/check-rates", label: t("nav_check_rates"), icon: "🔍" },
      { to: "/nearby", label: t("nav_nearby"), icon: "📍" },
      { to: "/mandis", label: t("nav_mandis"), icon: "🏛️" },
      { to: "/crops", label: t("nav_crops"), icon: "📈" },
      { to: "/dashboard", label: t("nav_dashboard"), icon: "📊" },
    ];
  }
  // (logged out = empty array = no app links shown)

  const barBackground = isAdmin ? "bg-ink-gradient" : "bg-primary-gradient";

  return (
    <nav
      className={`${barBackground} sticky top-0 z-40 transition-all duration-300 ${
        isScrolled ? "shadow-lifted" : "shadow-soft"
      }`}
    >
      <div
        className={`max-w-7xl 2xl:max-w-[100rem] mx-auto flex items-center justify-between gap-3 px-4 sm:px-6
          transition-all duration-300 ${isScrolled ? "py-2" : "py-3.5"}`}
      >
        {/* ================= LOGO ================= */}
        <NavLink
          to={isAdmin ? "/admin" : "/"}
          className="flex items-center gap-2.5 group shrink-0"
        >
          {/* A rounded badge behind the emoji gives the mark a definite
              shape, rather than an emoji floating on a coloured bar. */}
          <span
            className={`grid place-items-center rounded-xl bg-white/15 ring-1 ring-white/25
              transition-all duration-300 group-hover:bg-white/25 group-hover:scale-105
              ${isScrolled ? "w-9 h-9 text-lg" : "w-11 h-11 text-2xl"}`}
          >
            {isAdmin ? "👑" : "🌾"}
          </span>

          <span className="text-white font-bold leading-tight">
            <span className={isScrolled ? "text-base" : "text-lg"}>Mandi</span>
            <span
              className={`hidden 2xl:inline text-white/75 ${
                isScrolled ? "text-base" : "text-lg"
              }`}
            >
              {" "}
              Price Checker
            </span>
            {isAdmin && (
              <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-accent-300 leading-none mt-0.5">
                Admin Panel
              </span>
            )}
          </span>
        </NavLink>

        {/* ================= LINKS (desktop) ================= */}
        <div className="hidden xl:flex items-center gap-0.5 2xl:gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap
                 transition-all duration-200 ${
                   isActive
                     ? "bg-white text-primary-700 shadow-sm"
                     : "text-white/90 hover:bg-white/15 hover:text-white"
                 }`
              }
            >
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* ================= RIGHT SIDE (desktop) ================= */}
        <div className="hidden xl:flex items-center gap-2 shrink-0">
          {canChangeLanguage && (
            <LanguageSwitch
              language={language}
              languages={languages}
              onChange={setLanguage}
              label={t("select_language")}
            />
          )}

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              {/* The user's initial in a circle - faster to recognise
                  than a name, and it doesn't grow with long names. */}
              <span className="grid place-items-center w-9 h-9 rounded-full bg-white/20 ring-1 ring-white/30 text-white text-sm font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden 2xl:block text-white/90 text-sm max-w-[8rem] truncate">
                {currentUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-white/15 text-white
 ring-1 ring-white/20 hover:bg-white/30 transition-all"
              >
                {t("nav_logout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white
 ring-1 ring-white/40 hover:bg-white/15 transition-all"
              >
                {t("nav_login")}
              </NavLink>
              <NavLink
                to="/signup"
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white text-primary-700
 shadow-sm hover:bg-accent-100 hover:text-accent-800 hover:scale-105 transition-all"
              >
                {t("nav_signup")}
              </NavLink>
            </div>
          )}
        </div>

        {/* ================= HAMBURGER (mobile) ================= */}
        <button
          className="xl:hidden grid place-items-center w-10 h-10 rounded-xl bg-white/15
 ring-1 ring-white/25 text-white text-xl hover:bg-white/25 transition-all"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ================= MOBILE MENU ================= */}
      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-white/15 bg-black/10 px-4 py-4 animate-fadeInDown">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                    isActive
                      ? "bg-white text-primary-700"
                      : "text-white/90 hover:bg-white/15"
                  }`
                }
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="border-t border-white/15 my-3" />

          {canChangeLanguage && (
            <LanguageSwitch
              language={language}
              languages={languages}
              onChange={setLanguage}
              label={t("select_language")}
              fullWidth
            />
          )}

          {isLoggedIn ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-white/90 text-sm min-w-0">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-white/20 ring-1 ring-white/30 text-white font-bold shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{currentUser.name}</span>
              </span>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/15 text-white ring-1 ring-white/20 shrink-0"
              >
                {t("nav_logout")}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <NavLink
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 text-center px-4 py-3 rounded-xl text-sm font-semibold text-white ring-1 ring-white/40"
              >
                {t("nav_login")}
              </NavLink>
              <NavLink
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 text-center px-4 py-3 rounded-xl text-sm font-bold bg-white text-primary-700"
              >
                {t("nav_signup")}
              </NavLink>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// ---------------------------------------------------------------------
// The language picker.
//
// A plain <select> on purpose: on a phone it opens the native OS picker,
// which is easier one-handed and already knows how to render every
// Indian script. Each option shows the language's name in its OWN script
// ("தமிழ்", not "Tamil"), because that's how someone looks for it.
//
// Never rendered for admins - see `canChangeLanguage` in
// context/LanguageContext.jsx.
// ---------------------------------------------------------------------
function LanguageSwitch({ language, languages, onChange, label, fullWidth = false }) {
  return (
    <label className={`relative flex items-center ${fullWidth ? "w-full" : ""}`}>
      <span className="sr-only">{label}</span>

      <span className="pointer-events-none absolute left-3 text-sm">🌐</span>

      <select
        value={language}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className={`${fullWidth ? "w-full py-3" : "py-2"} appearance-none cursor-pointer
          bg-white/15 hover:bg-white/25 ring-1 ring-white/25
          text-white text-sm font-semibold rounded-xl pl-9 pr-9
          transition-all focus:outline-none focus:ring-2 focus:ring-white/70`}
      >
        {languages.map((lang) => (
          // The dropdown list is drawn by the operating system, so these
          // need dark text on white to stay readable.
          <option key={lang.code} value={lang.code} className="text-ink-900 bg-white">
            {lang.nativeLabel}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-3 text-white/70 text-[10px]">▼</span>
    </label>
  );
}

export default Navbar;
