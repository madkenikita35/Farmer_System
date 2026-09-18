// components/AppShell.jsx
// -----------------------------------------------------------------------
// The frame every page sits inside: sidebar on the left, thin bar across
// the top, page content in the middle, footer underneath.
//
// It owns the two pieces of state the navigation needs, and nothing
// else:
//
//   isCollapsed  - desktop: is the sidebar an icon-only rail?
//   isDrawerOpen - phone: is the sidebar currently slid over the page?
//
// They are separate on purpose. Collapsing is a PREFERENCE, so it is
// remembered. Opening the drawer is a momentary ACTION, so it is not -
// nobody wants to arrive on a page with the menu already covering it.
//
// WHY THERE IS NO SIDEBAR WHEN LOGGED OUT
// A logged-out visitor can only reach /login and /signup, so the sidebar
// would be an empty panel taking up a fifth of the screen. The top bar
// alone is the right shape for those two pages.
// -----------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Footer from "./Footer";

// Kept in localStorage alongside `mandi_language`. Both are UI
// preferences with nothing private in them - no token, no name, no
// phone number ever goes in here. See context/AuthContext.jsx for why
// that rule exists.
const COLLAPSED_KEY = "mandi_sidebar_collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    // Private-browsing mode and blocked site data both make this throw.
    // A missing preference is not worth breaking the page over.
    return false;
  }
}

function AppShell({ children }) {
  const { t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---- Remember the collapsed choice ----
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
    } catch {
      // Not being able to remember it is a small loss; crashing is not.
    }
  }, [isCollapsed]);

  // ---- Close the drawer whenever the page changes ----
  // Without this, tapping a link on a phone navigates behind a menu that
  // is still covering the screen.
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // ---- Escape closes the drawer ----
  // Anything that covers the screen needs a way out that is not "find
  // the small × in the corner".
  useEffect(() => {
    if (!isDrawerOpen) return;

    function handleKey(event) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isDrawerOpen]);

  // ---- Stop the page scrolling behind an open drawer ----
  // Otherwise a swipe on the menu scrolls the page underneath it, which
  // feels broken.
  useEffect(() => {
    if (!isDrawerOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDrawerOpen]);

  // Logged out: top bar and content only.
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar
          onOpenMenu={() => {}}
          onToggleCollapse={() => {}}
          isCollapsed={false}
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    );
  }

  const railWidth = isCollapsed ? "lg:w-[4.5rem]" : "lg:w-64";

  return (
    <div className="min-h-screen flex">
      {/* ================= SIDEBAR (desktop) ================= */}
      {/* `sticky` with a full-height box keeps it in place while the
          page scrolls, without the position:fixed offsets that make
          every other element need a matching margin. */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-card border-r border-surface-300
          sticky top-0 h-screen transition-[width] duration-200 ${railWidth}`}
      >
        <BrandMark isCollapsed={isCollapsed} />
        <Sidebar isCollapsed={isCollapsed} />
      </aside>

      {/* ================= SIDEBAR (phone drawer) ================= */}
      {isDrawerOpen && (
        <>
          {/* The backdrop both dims the page and gives a large, easy
              target for closing - much easier to hit than a × while
              holding a phone one-handed. */}
          <div
            // z-[60] puts it over the floating voice orb (z-50), which
            // would otherwise sit on top of the dimmed page looking
            // like it was still usable.
            className="lg:hidden fixed inset-0 z-[60] bg-black/50 animate-fadeIn"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-[70] w-72 bg-card border-r
              border-surface-300 shadow-lifted flex flex-col animate-fadeInLeft"
          >
            <div className="flex items-center justify-between pr-2">
              <BrandMark isCollapsed={false} />
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label={t("nav_close")}
                className="grid place-items-center w-10 h-10 rounded-xl text-ink-500
                  hover:bg-surface-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Closing on navigate is handled by the route effect above
                too; this makes it instant instead of waiting a frame. */}
            <Sidebar isCollapsed={false} onNavigate={() => setIsDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* ================= PAGE ================= */}
      {/* `min-w-0` matters: without it a wide table inside a page can
          push this column past the viewport and the whole layout
          scrolls sideways. */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onOpenMenu={() => setIsDrawerOpen(true)}
          onToggleCollapse={() => setIsCollapsed((value) => !value)}
          isCollapsed={isCollapsed}
        />

        {/* flex-1 pushes the Footer to the bottom even on short pages */}
        <main className="flex-1">{children}</main>

        <Footer />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The logo at the top of the sidebar.
//
// Farmers get the green wheat mark, admins a navy crown, so which side
// of the app you are on is obvious without reading anything.
// ---------------------------------------------------------------------
function BrandMark({ isCollapsed }) {
  const { isAdmin } = useAuth();

  return (
    <div
      className={`flex items-center gap-2.5 h-[3.75rem] shrink-0 border-b
        border-surface-300 ${isCollapsed ? "justify-center px-0" : "px-4"}`}
    >
      <span
        className={`grid place-items-center w-9 h-9 rounded-xl text-lg shrink-0
          ${isAdmin ? "bg-secondary text-secondary-foreground" : "bg-primary-gradient"}`}
      >
        {isAdmin ? "👑" : "🌾"}
      </span>

      {!isCollapsed && (
        <span className="font-bold text-ink-900 leading-tight truncate">
          Mandi
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            {isAdmin ? "Admin Panel" : "Price Checker"}
          </span>
        </span>
      )}
    </div>
  );
}

export default AppShell;
