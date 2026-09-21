// components/BottomTabBar.jsx
// -----------------------------------------------------------------------
// The row of tabs pinned to the bottom of the screen, in the installed
// app only.
//
// ---------------------------------------------------------------------
// WHY THIS EXISTS AND THE SIDEBAR IS NOT ENOUGH
// ---------------------------------------------------------------------
// On a phone the sidebar is a drawer: it is off screen until you find
// the hamburger, open it, and pick something. That is two taps and a
// hidden control for every navigation - normal on a website, and the
// clearest "this is a web page" signal in a wrapped app.
//
// Every native app puts its main destinations where the thumb already
// is. One tap, always visible, and you can see where you are without
// opening anything.
//
// ---------------------------------------------------------------------
// WHAT IT DOES NOT DO
// ---------------------------------------------------------------------
// It does not replace the sidebar, and it never renders on the web.
// AppShell only mounts it when Capacitor reports a native platform, so
// the website's navigation is exactly as it was.
//
// It also holds only FIVE destinations. The drawer is still there for
// Mandis, Upload and Dashboard - a tab bar with eight items is a menu
// with extra steps, and each target gets too narrow to hit.
// -----------------------------------------------------------------------

import { NavLink } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  SearchIcon,
  LocationIcon,
  TrendIcon,
  UserIcon,
  LoginIcon,
  ICON_STROKE,
} from "./icons";

// The five that earn a permanent place: the three price answers the app
// exists to give, the way home, and you.
//
// `end` is only on Home, because "/" is a prefix of every other path -
// without it the Home tab would look active on every screen.
function buildTabs({ isLoggedIn, t }) {
  return [
    { to: "/", labelKey: "nav_home", Icon: HomeIcon, end: true },
    { to: "/check-rates", labelKey: "nav_check_rates", Icon: SearchIcon },
    { to: "/nearby", labelKey: "nav_nearby", Icon: LocationIcon },
    { to: "/crops", labelKey: "nav_crops", Icon: TrendIcon },
    isLoggedIn
      ? { to: "/profile", labelKey: "nav_profile", Icon: UserIcon }
      : { to: "/login", labelKey: "nav_login", Icon: LoginIcon },
  ];
}

function BottomTabBar() {
  const { t } = useLanguage();
  const { isLoggedIn } = useAuth();

  const tabs = buildTabs({ isLoggedIn, t });

  return (
    <nav
      aria-label={t("nav_menu")}
      // pb uses the safe-area inset so the row sits ABOVE the home
      // indicator on a gesture-navigation phone, rather than under it
      // where a swipe would hit the system instead of the tab.
      className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-surface-300
        flex items-stretch"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5
             min-h-[3.5rem] px-1 transition-colors ${
               isActive ? "text-primary-700" : "text-ink-500"
             }`
          }
        >
          {({ isActive }) => (
            <>
              {/* The active tab is marked by a filled pill behind the
                  icon as well as by colour. Colour alone is easy to miss
                  at arm's length, and invisible to anyone colour-blind. */}
              <span
                className={`flex items-center justify-center w-10 h-6 rounded-full
                  transition-colors ${isActive ? "bg-primary-50" : ""}`}
              >
                <tab.Icon
                  size={20}
                  strokeWidth={isActive ? 2 : ICON_STROKE}
                  aria-hidden="true"
                />
              </span>

              <span
                className={`text-[10px] leading-none truncate max-w-full ${
                  isActive ? "font-semibold" : "font-normal"
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomTabBar;
