// components/StatCard.jsx
// -----------------------------------------------------------------------
// A small, reusable "number + label" card, used at the top of most pages
// (e.g. "Total Receipts: 12"). Being its own component means every stat
// across the app looks the same, and restyling them is a one-file job.
//
// THE DESIGN
// The icon sits in a soft tinted square rather than floating loose, which
// gives the card a clear left edge and stops the row of cards looking
// like scattered text. `tone` picks that tint from the palette:
//
//     tone="primary"  green   - the normal, positive case
//     tone="accent"   amber   - something worth attention
//     tone="ink"      slate   - neutral facts and counts
//     tone="under"    red     - a problem (underpaid, blocked, lost money)
//
// The old `color` prop (a raw Tailwind text class) still works, so the
// dozens of existing <StatCard color="text-primary-700"> calls around
// the app keep rendering - they just don't get the tinted icon tile.
// -----------------------------------------------------------------------

// Each tone's three pieces: the icon tile's background, the icon tile's
// text colour, and the colour of the big number.
const TONES = {
  primary: {
    tile: "bg-primary-100 text-primary-700",
    value: "text-primary-700",
  },
  accent: {
    tile: "bg-accent-100 text-accent-700",
    value: "text-accent-700",
  },
  ink: {
    tile: "bg-ink-100 text-ink-700",
    value: "text-ink-800",
  },
  under: {
    tile: "bg-under-100 text-under-700",
    value: "text-under-600",
  },
};

function StatCard({ label, value, icon, tone = "primary", color }) {
  const styles = TONES[tone] || TONES.primary;

  // If a caller passed the old `color` prop, honour it for the number.
  const valueClass = color || styles.value;

  return (
    <div
      className="group bg-white rounded-2xl shadow-soft p-5 flex items-center gap-4
 border border-surface-300/60 hover-lift animate-popIn"
    >
      <div
        className={`grid place-items-center w-12 h-12 rounded-xl text-2xl shrink-0
          transition-transform duration-300 group-hover:scale-110 ${styles.tile}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm text-ink-500 truncate">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
