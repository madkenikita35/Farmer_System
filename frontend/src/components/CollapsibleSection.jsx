// components/CollapsibleSection.jsx
// -----------------------------------------------------------------------
// A section with a heading you can tap to fold away.
//
// WHY THIS EXISTS
// Stage 4 folds up the same kind of thing on five different pages -
// charts, coverage breakdowns, data-quality notes. Writing the
// <details> markup five times is five chances for them to end up
// looking slightly different from each other.
//
// WHY <details> AND NOT useState
// <details>/<summary> is plain HTML. The browser handles opening and
// closing, remembers the state, makes it keyboard-operable, and tells a
// screen reader whether it is expanded - all without a line of
// JavaScript. A useState version would be more code doing the same job
// slightly worse.
//
// The one fiddly bit is `list-none`, which removes the browser's default
// triangle marker so we can draw our own that matches the rest of the
// app. `group-open:` is Tailwind's hook for "the parent <details> is
// open", which is what rotates the arrow.
//
// USAGE
//   <CollapsibleSection title="Price charts">
//     ...anything...
//   </CollapsibleSection>
//
//   defaultOpen  - start expanded. Use it when the content is the
//                  answer; leave it off when the content is background.
//   subtitle     - a quiet line under the title, for a count or a hint.
// -----------------------------------------------------------------------

import { ExpandIcon, ICON_MD, ICON_STROKE } from "./icons";

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = "",
}) {
  return (
    <details
      open={defaultOpen}
      className={`group bg-card rounded-lg shadow-soft border border-surface-300/60 ${className}`}
    >
      <summary
        className="cursor-pointer list-none flex items-center gap-2.5 px-5 sm:px-6 py-4
          rounded-lg hover:bg-surface-100 transition-colors"
      >
        {/* Our own marker, since list-none removed the browser's. It
            points right when closed and down when open. */}
        <ExpandIcon
          size={ICON_MD}
          strokeWidth={ICON_STROKE}
          className="text-ink-400 shrink-0 transition-transform duration-200 group-open:rotate-90"
          aria-hidden="true"
        />

        <span className="min-w-0">
          <span className="block font-medium text-ink-900 truncate">{title}</span>
          {subtitle && (
            <span className="block text-xs text-ink-500 truncate">{subtitle}</span>
          )}
        </span>
      </summary>

      <div className="px-5 sm:px-6 pb-5">{children}</div>
    </details>
  );
}

export default CollapsibleSection;
