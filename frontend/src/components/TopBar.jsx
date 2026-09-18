// components/TopBar.jsx
// -----------------------------------------------------------------------
// The slim bar across the top of every page.
//
// It holds only the things that are NOT navigation: who you are, what
// language you want, and the way out. The links themselves moved to the
// sidebar, which is what freed up the room.
//
// It is also the only place the menu can be opened on a phone, so the
// hamburger lives here.
//
// WHY IT IS PALE NOW
// The old bar was a solid green gradient, which meant everything on it
// had to be white and every page began with a heavy band of colour. The
// brand mark still carries the green; the bar itself gets out of the
// way. Admins keep a distinguishing mark on the logo badge so it is
// still obvious which side of the app you are on.
// -----------------------------------------------------------------------

import { NavLink, useNavigate } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

function TopBar({ onOpenMenu, onToggleCollapse, isCollapsed }) {
  const { t, language, setLanguage, languages, canChangeLanguage } = useLanguage();
  const { currentUser, isAdmin, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header
      className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-surface-300
        px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3"
    >
      {/* ---- Open the drawer (phones and tablets only) ---- */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t("nav_menu")}
        className="lg:hidden grid place-items-center w-10 h-10 rounded-xl text-xl
          text-ink-600 hover:bg-surface-200 transition-colors"
      >
        ☰
      </button>

      {/* ---- Collapse the rail (desktop only) ---- */}
      {/* Deliberately next to the sidebar edge rather than inside the
          sidebar: when the rail is collapsed to 4.5rem there is no room
          for a control that also has to stay reachable. */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? t("nav_expand") : t("nav_collapse")}
        title={isCollapsed ? t("nav_expand") : t("nav_collapse")}
        aria-expanded={!isCollapsed}
        className="hidden lg:grid place-items-center w-9 h-9 rounded-xl text-ink-500
          hover:bg-surface-200 hover:text-ink-700 transition-colors"
      >
        {/* Points the way it will move. */}
        {isCollapsed ? "»" : "«"}
      </button>

      {/* ---- Brand ---- */}
      {/* On a phone the sidebar is off screen, so without this there
          would be nothing on the page identifying the app. */}
      <NavLink
        to={isAdmin ? "/admin" : "/"}
        className="flex items-center gap-2 min-w-0 lg:hidden"
      >
        <span className="text-xl leading-none">{isAdmin ? "👑" : "🌾"}</span>
        <span className="font-bold text-ink-900 truncate">Mandi</span>
      </NavLink>

      {/* Pushes everything after it to the right. */}
      <div className="flex-1" />

      {/* ---- Appearance ---- */}
      <ThemeToggle />

      {/* ---- Language ---- */}
      {canChangeLanguage && (
        <LanguageSwitch
          language={language}
          languages={languages}
          onChange={setLanguage}
          label={t("select_language")}
        />
      )}

      {/* ---- Who you are, and the way out ---- */}
      {isLoggedIn ? (
        <div className="flex items-center gap-2 shrink-0">
          {/* The initial in a circle - faster to recognise than a name,
              and it does not grow with long ones. */}
          <span
            className="grid place-items-center w-9 h-9 rounded-full bg-primary-100
              text-primary-700 text-sm font-bold shrink-0"
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </span>

          {/* The name is the first thing to go when space is tight - the
              avatar already answers "am I logged in as me?". */}
          <span className="hidden md:block text-ink-700 text-sm max-w-[8rem] truncate">
            {currentUser.name}
          </span>

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-ink-600
              hover:bg-negative-50 hover:text-negative-700 transition-colors"
          >
            {t("nav_logout")}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <NavLink
            to="/login"
            className="px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold text-ink-700
              hover:bg-surface-200 transition-colors"
          >
            {t("nav_login")}
          </NavLink>
          <NavLink
            to="/signup"
            className="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-primary-600
              text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t("nav_signup")}
          </NavLink>
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------
// The language picker.
//
// A plain <select> on purpose: on a phone it opens the native OS picker,
// which is easier one-handed and already knows how to render every
// Indian script. Each option shows the language's name in its OWN script
// ("தமிழ்", not "Tamil"), because that is how someone looks for it.
//
// Never rendered for admins - see `canChangeLanguage` in
// context/LanguageContext.jsx.
// ---------------------------------------------------------------------
function LanguageSwitch({ language, languages, onChange, label }) {
  return (
    <label className="relative flex items-center shrink-0">
      <span className="sr-only">{label}</span>

      <span className="pointer-events-none absolute left-2.5 text-sm">🌐</span>

      <select
        value={language}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className="appearance-none cursor-pointer py-2 pl-8 pr-7
          bg-surface-200 hover:bg-surface-300 text-ink-700 text-sm font-semibold
          rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {languages.map((lang) => (
          // The dropdown list is drawn by the operating system, so these
          // need their own colours to stay readable.
          <option key={lang.code} value={lang.code} className="text-ink-900 bg-card">
            {lang.nativeLabel}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-2.5 text-ink-400 text-[10px]">
        ▼
      </span>
    </label>
  );
}

export default TopBar;
