// components/TopBar.jsx
// -----------------------------------------------------------------------
// The slim bar across the top of every page.
//
// ---------------------------------------------------------------------
// WHAT IT DELIBERATELY DOES NOT HOLD ANY MORE
// ---------------------------------------------------------------------
// It used to carry the language picker, the theme swatch, the avatar,
// the full name AND a logout button - five controls, on every page,
// competing with whatever the page was actually for.
//
// None of them are used often: you choose a language once, and you log
// out at the end. So they all moved to /profile, and the header kept the
// single thing that has to stay visible - WHO you are signed in as,
// which is now also the link to that page.
//
// Guests see Log In / Sign Up instead. They are not blocked from
// anything except Upload and Dashboard, so there is nothing else here
// they need.
// -----------------------------------------------------------------------

import { NavLink } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  MenuIcon,
  CollapseIcon,
  ExpandIcon,
  CropIcon,
  AdminIcon,
  ICON_MD,
  ICON_STROKE,
} from "./icons";

function TopBar({ onOpenMenu, onToggleCollapse, isCollapsed }) {
  const { t } = useLanguage();
  const { currentUser, isAdmin, isLoggedIn } = useAuth();

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
        className="lg:hidden grid place-items-center w-10 h-10 rounded-md
          text-ink-600 hover:bg-surface-200 transition-colors"
      >
        <MenuIcon size={ICON_MD + 4} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </button>

      {/* ---- Collapse the rail (desktop only) ---- */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? t("nav_expand") : t("nav_collapse")}
        title={isCollapsed ? t("nav_expand") : t("nav_collapse")}
        aria-expanded={!isCollapsed}
        className="hidden lg:grid place-items-center w-9 h-9 rounded-md text-ink-500
          hover:bg-surface-200 hover:text-ink-700 transition-colors"
      >
        {isCollapsed ? (
          <ExpandIcon size={ICON_MD} strokeWidth={ICON_STROKE} aria-hidden="true" />
        ) : (
          <CollapseIcon size={ICON_MD} strokeWidth={ICON_STROKE} aria-hidden="true" />
        )}
      </button>

      {/* ---- Brand ---- */}
      {/* On a phone the sidebar is off screen, so without this there
          would be nothing on the page identifying the app. */}
      <NavLink
        to={isAdmin ? "/admin" : "/"}
        className="flex items-center gap-2 min-w-0 lg:hidden"
      >
        {isAdmin ? (
          <AdminIcon size={ICON_MD + 2} strokeWidth={ICON_STROKE} className="text-primary-700" />
        ) : (
          <CropIcon size={ICON_MD + 2} strokeWidth={ICON_STROKE} className="text-primary-700" />
        )}
        <span className="font-semibold text-ink-900 truncate">Mandi</span>
      </NavLink>

      {/* Pushes everything after it to the right. */}
      <div className="flex-1" />

      {isLoggedIn ? (
        /* ---- ONE control: who you are, and the way to everything else.
           The initial in a square is faster to recognise than a name and
           does not grow with long ones; the first name beside it is what
           confirms you are signed in as yourself rather than as whoever
           last used a shared phone. ---- */
        <NavLink
          to="/profile"
          title={t("nav_profile")}
          className={({ isActive }) =>
            `flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-md
             transition-colors ${
               isActive ? "bg-primary-50" : "hover:bg-surface-200"
             }`
          }
        >
          <span
            className="grid place-items-center w-7 h-7 rounded bg-primary-100
              text-primary-700 text-xs font-semibold shrink-0"
          >
            {currentUser?.name?.charAt(0).toUpperCase() || "?"}
          </span>
          <span className="hidden sm:block text-sm text-ink-700 max-w-[7rem] truncate">
            {/* First name only. The surname adds width without adding
                information at this size. */}
            {String(currentUser?.name || "").split(" ")[0]}
          </span>
        </NavLink>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <NavLink
            to="/login"
            className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-ink-700
              hover:bg-surface-200 transition-colors"
          >
            {t("nav_login")}
          </NavLink>
          <NavLink
            to="/signup"
            className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium bg-primary-600
              text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t("nav_signup")}
          </NavLink>
        </div>
      )}
    </header>
  );
}

export default TopBar;
