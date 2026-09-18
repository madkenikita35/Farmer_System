// components/BuySellScopeCards.jsx
// -----------------------------------------------------------------------
// The Near Me page's price cards, at three distances and in two modes.
//
//   Near You  - inside the chosen radius
//   State     - across the farmer's state
//   National  - across India
//
// Each section shows two cards, and WHICH two depends on the buy/sell
// toggle:
//
//   SELLING  Card 1 "Highest Price Near You"
//            Card 2 "Closest High Price"      (nearest of the top 25%)
//
//   BUYING   Card 1 "Lowest Price Near You"
//            Card 2 "Closest Low Price"       (nearest of the bottom 25%)
//
// ---------------------------------------------------------------------
// WHY CARD 2 IS NOT SIMPLY "THE NEAREST MANDI"
// ---------------------------------------------------------------------
// It used to be, and that was a poor card: the closest mandi can be the
// one paying the least in the whole radius, so the page would
// cheerfully point at the worst option because it was near.
//
// "Nearest among the good-priced ones" is the question a farmer is
// actually asking - not the best price, not the shortest drive, but the
// shortest drive that still gets a good price. The backend picks the
// group (top or bottom quarter); this component only renders it.
//
// ---------------------------------------------------------------------
// COLOURS
// ---------------------------------------------------------------------
// Card 1 keeps the existing green (bg-positive-50 / border-positive-200) and
// Card 2 the existing sky blue, in both modes. Green means "the best
// number in this scope" whichever direction best runs in - flipping the
// colours with the mode would make the page harder to read, not easier.
// -----------------------------------------------------------------------

import { useLanguage } from "../context/LanguageContext";

/** How a distance reads - mirrors the rest of the app. */
function distanceText(mandi, t) {
  if (!mandi || mandi.distanceKm == null) return "";

  if (mandi.distanceAccuracy === "state") {
    return t("nm_km_away_rough", { km: Math.round(mandi.distanceKm) });
  }
  if (mandi.distanceKm < 12) return t("nm_in_your_area_lower");
  return t("nm_km_away", { km: Math.round(mandi.distanceKm) });
}

// One mandi card. Same shape and colours as the pair this replaces.
function MandiCard({ mandi, title, emoji, tone }) {
  const { t } = useLanguage();

  const styles =
    tone === "good"
      ? "bg-positive-50 border-positive-200 text-positive-900"
      : "bg-info-50 border-info-200 text-info-900";

  if (!mandi) {
    return (
      <div className={`rounded-2xl border px-5 py-4 ${styles} opacity-60`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
          {emoji} {title}
        </p>
        <p className="text-sm opacity-70">—</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles} hover-lift`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
        {emoji} {title}
      </p>

      <p className="text-lg font-bold leading-tight">{mandi.mandiName}</p>
      <p className="text-sm opacity-70 mb-2">
        {mandi.district ? `${mandi.district}, ` : ""}
        {mandi.state}
      </p>

      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-3xl font-bold">
          ₹{Math.round(mandi.modalPrice).toLocaleString("en-IN")}
        </span>
        <span className="text-sm opacity-70">{distanceText(mandi, t)}</span>
      </div>
    </div>
  );
}

/**
 * One scope: a heading, its two cards, and the trade-off line.
 */
function ScopeSection({ scope, mode, titleKey, subtitle, isLoading, emptyKey }) {
  const { t } = useLanguage();

  const selling = mode !== "buy";

  // Titles change with the mode; the CARDS do not, because the backend
  // has already picked the right end of the price list.
  const card1Title = selling ? t("bs_highest_here") : t("bs_lowest_here");
  const card2Title = selling ? t("bs_closest_high") : t("bs_closest_low");

  return (
    <div className="mb-6">
      <div className="mb-3">
        <h2 className="font-semibold text-ink-900">{t(titleKey)}</h2>
        <p className="text-xs text-ink-400">{subtitle}</p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-surface-300/60 bg-card px-5 py-4 animate-pulse"
            >
              <div className="h-3 w-24 bg-surface-200 rounded mb-3" />
              <div className="h-5 w-40 bg-surface-200 rounded mb-2" />
              <div className="h-3 w-28 bg-surface-200 rounded mb-3" />
              <div className="h-8 w-32 bg-surface-200 rounded" />
            </div>
          ))}
        </div>
      ) : !scope || scope.mandiCount === 0 ? (
        <div className="text-center py-10 bg-card rounded-2xl border border-surface-300/60">
          <div className="text-3xl mb-2">🤷</div>
          <p className="text-sm text-ink-500 max-w-md mx-auto">{t(emptyKey)}</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <MandiCard
              mandi={scope.bestPrice}
              title={card1Title}
              emoji={selling ? "💰" : "🏷️"}
              tone="good"
            />
            <MandiCard
              mandi={scope.closestGood}
              title={card2Title}
              emoji="📍"
              tone="neutral"
            />
          </div>

          {/* The trade-off, worded for whichever side the farmer is on:
              money GAINED when selling, money SAVED when buying. */}
          {scope.bestPrice &&
            scope.closestGood &&
            scope.bestPrice.mandiName !== scope.closestGood.mandiName && (
              <TradeOffLine scope={scope} selling={selling} />
            )}

          <p className="text-[11px] text-ink-400 mt-2">
            {t("bs_compared_across", { count: scope.mandiCount })}
          </p>
        </>
      )}
    </div>
  );
}

function TradeOffLine({ scope, selling }) {
  const { t } = useLanguage();

  const best = scope.bestPrice;
  const closest = scope.closestGood;

  // Always positive: selling, the far mandi pays more; buying, it costs
  // less. Either way this is "worth this much per quintal".
  const perQuintal = Math.round(
    selling ? best.modalPrice - closest.modalPrice : closest.modalPrice - best.modalPrice
  );
  const extraKm = Math.round((best.distanceKm - closest.distanceKm) * 10) / 10;

  // If the better price is also the closer one there is no trade-off to
  // weigh - saying "but it is -20 km further" would be nonsense.
  if (perQuintal <= 0 || extraKm <= 0) return null;

  return (
    <div className="bg-warning-50 border border-warning-200 rounded-xl px-5 py-3 mt-3 text-sm text-warning-900">
      💡{" "}
      {t(selling ? "bs_tradeoff_sell" : "bs_tradeoff_buy", {
        amount: perQuintal.toLocaleString("en-IN"),
        km: extraKm,
        total: (perQuintal * 10).toLocaleString("en-IN"),
      })}
    </div>
  );
}

function BuySellScopeCards({ scopes, mode, isLoading, radiusKm }) {
  const { t } = useLanguage();

  if (!scopes && !isLoading) return null;

  const stateName = scopes?.state?.stateName;

  return (
    <div>
      <ScopeSection
        scope={scopes?.nearYou}
        mode={mode}
        titleKey="bs_scope_near"
        subtitle={t("scope_near_you_sub", { radius: radiusKm })}
        isLoading={isLoading}
        emptyKey="scope_empty_radius"
      />

      <ScopeSection
        scope={scopes?.state}
        mode={mode}
        titleKey="bs_scope_state"
        subtitle={
          stateName ? t("scope_state_sub", { state: stateName }) : t("scope_state_sub_unknown")
        }
        isLoading={isLoading}
        emptyKey="scope_empty_state"
      />

      <ScopeSection
        scope={scopes?.national}
        mode={mode}
        titleKey="bs_scope_national"
        subtitle={t("scope_national_sub")}
        isLoading={isLoading}
        emptyKey="scope_empty"
      />
    </div>
  );
}

export default BuySellScopeCards;
