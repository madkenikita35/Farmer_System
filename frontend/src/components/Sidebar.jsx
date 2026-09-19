// components/Sidebar.jsx
// -----------------------------------------------------------------------
// The main navigation, moved out of the top bar and down the left side.
//
// WHY IT MOVED
// The old navbar put seven links, a language picker, a name, an avatar
// and a logout button on ONE horizontal line. There is only so much
// width, so everything was squeezed: links shrank to `px-2.5`, the app
// name hid below 2xl, and below xl the whole thing collapsed into a
// hamburger. A sidebar has as much VERTICAL room as it needs, which is
// why the links can now be grouped and given headings instead of being
// an undifferentiated row.
//
// WHAT THE DESIGN IS DOING
//
// - Links are GROUPED under headings ("Prices", "My Records",
//   "Account"). Seven flat links is a list you have to read; three
//   groups of two or three is a shape you can remember.
//
// - Every link keeps its ICON. The app is translated into eleven
//   languages, and a farmer who reads slowly navigates by icon. This is
//   also what makes the collapsed rail usable at all.
//
// - The active link is a filled PILL, not just coloured text. On a phone
//   held at arm's length a colour difference is easy to miss; a filled
//   shape is not. (Carried over from the old navbar - it was a good
//   call.)
//
// - COLLAPSED mode shows icons only, at 4.5rem wide. The choice is
//   remembered, because someone who wants the extra width wants it on
//   every page, not once.
//
// - On phones the sidebar is not on screen at all: it slides in over the
//   content as a drawer. A permanent sidebar on a 360px screen would eat
//   half the width.
//
// All of this is presentation. The pages are guarded by ProtectedRoute
// and the data by the backend - hiding a link is not security.
// -----------------------------------------------------------------------

import { NavLink } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  SearchIcon,
  LocationIcon,
  MandiIcon,
  TrendIcon,
  UploadIcon,
  DashboardIcon,
  FarmersIcon,
  ActivityIcon,
  UserIcon,
  ICON_MD,
  ICON_STROKE,
} from "./icons";

// ---------------------------------------------------------------------
// WHICH LINKS, AND UNDER WHICH HEADING
// ---------------------------------------------------------------------
// Returned as data rather than written as JSX so the drawer and the
// desktop rail cannot drift apart - they render the same array. This is
// the same reason the old navbar built a `navLinks` list.
//
// `t` is passed in rather than read here, because this is a plain
// function and hooks may only be called inside components.
// ---------------------------------------------------------------------
function buildGroups({ isAdmin, isLoggedIn, t }) {
  if (isAdmin) {
    // The admin panel is English-only - see `canChangeLanguage` in
    // context/LanguageContext.jsx - so these labels are not translated.
    return [
      {
        heading: "Admin",
        links: [
          { to: "/admin", label: "Dashboard", Icon: DashboardIcon, end: true },
          { to: "/admin/farmers", label: "Farmers", Icon: FarmersIcon },
          { to: "/admin/activity", label: "Activity", Icon: ActivityIcon },
        ],
      },
      {
        heading: "Data",
        links: [{ to: "/mandis", label: "Mandis", Icon: MandiIcon }],
      },
    ];
  }

  return [
    {
      // No heading: Home sits on its own above the groups, because it
      // is not one of a set - it is the way back to the start.
      heading: null,
      links: [{ to: "/", label: t("nav_home"), Icon: HomeIcon, end: true }],
    },
    {
      // The four "what is my crop worth?" pages. This is the reason the
      // app exists, so it comes first and holds the most links.
      heading: t("nav_group_prices"),
      links: [
        { to: "/check-rates", label: t("nav_check_rates"), Icon: SearchIcon },
        { to: "/nearby", label: t("nav_nearby"), Icon: LocationIcon },
        { to: "/mandis", label: t("nav_mandis"), Icon: MandiIcon },
        { to: "/crops", label: t("nav_crops"), Icon: TrendIcon },
      ],
    },
    // The two account-only pages. A guest is still ALLOWED to click
    // them - they get an explanation and a sign-up button rather than a
    // locked door - but showing them in the menu to someone with no
    // account is advertising a dead end, so they appear once signed in.
    ...(isLoggedIn
      ? [
          {
            heading: t("nav_group_tools"),
            links: [{ to: "/upload", label: t("nav_upload"), Icon: UploadIcon }],
          },
          {
            heading: t("nav_group_account"),
            links: [
              { to: "/dashboard", label: t("nav_dashboard"), Icon: DashboardIcon },
              { to: "/profile", label: t("nav_profile"), Icon: UserIcon },
            ],
          },
        ]
      : []),
  ];
}

// ---------------------------------------------------------------------
// One link.
// ---------------------------------------------------------------------
function SidebarLink({ link, isCollapsed, onNavigate }) {
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      // When collapsed there is no text, so the browser's own tooltip is
      // the only way to find out what an icon means. aria-label does the
      // same job for a screen reader - which, with the old emoji, used
      // to announce "classical building" for the Mandis link.
      title={isCollapsed ? link.label : undefined}
      aria-label={isCollapsed ? link.label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-md font-medium transition-colors duration-150
         ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"}
         ${
           isActive
             ? "bg-primary-600 text-primary-foreground shadow-soft"
             : "text-ink-600 hover:bg-primary-50 hover:text-primary-700"
         }`
      }
    >
      {/* The icon inherits its colour from the link, so the active pill
          and the muted resting state need no icon styling of their own -
          which is exactly what per-emoji colours could never do. */}
      <link.Icon
        size={ICON_MD}
        strokeWidth={ICON_STROKE}
        className="shrink-0"
        aria-hidden="true"
      />

      {/* Hidden rather than removed when collapsed, so expanding does
          not have to rebuild the row. */}
      {!isCollapsed && <span className="truncate text-sm">{link.label}</span>}
    </NavLink>
  );
}

// ---------------------------------------------------------------------
// The sidebar.
//
// `isCollapsed`  - desktop icon-only rail
// `onNavigate`   - called after a link is followed. The drawer uses it
//                  to close itself; the desktop rail passes nothing.
// ---------------------------------------------------------------------
function Sidebar({ isCollapsed = false, onNavigate }) {
  const { t } = useLanguage();
  const { isAdmin, isLoggedIn } = useAuth();

  const groups = buildGroups({ isAdmin, isLoggedIn, t });

  return (
    <nav
      aria-label={t("nav_menu")}
      className="flex flex-col gap-1 py-4 h-full overflow-y-auto"
    >
      {groups.map((group, index) => (
        <div key={group.heading || `group-${index}`} className="px-3">
          {/* The heading is dropped when collapsed - there is no room
              for it, and a truncated word is worse than none. A hairline
              keeps the groups visually separate instead. */}
          {group.heading &&
            (isCollapsed ? (
              <div className="border-t border-surface-300 my-2" role="presentation" />
            ) : (
              <p
                className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase
                  tracking-[0.12em] text-ink-400"
              >
                {group.heading}
              </p>
            ))}

          <div className="flex flex-col gap-1">
            {group.links.map((link) => (
              <SidebarLink
                key={link.to}
                link={link}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default Sidebar;
