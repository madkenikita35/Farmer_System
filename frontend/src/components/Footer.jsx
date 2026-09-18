// components/Footer.jsx
// -----------------------------------------------------------------------
// A standard site footer shown at the bottom of every page. Real
// production sites almost always have one of these, with quick links,
// contact info, and a copyright line.
// -----------------------------------------------------------------------

import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary-gradient text-secondary-foreground mt-20 relative">
      {/* A thin accent stripe along the top, so the footer reads as a
          deliberate edge to the page rather than the content just
          running out into a dark block. */}
      <div className="h-1 w-full bg-accent-gradient" />

      <div className="max-w-6xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-8">
        {/* ---- Brand + tagline ---- */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 text-xl">🌾</span>
            <span className="font-bold text-lg">Mandi Price Checker</span>
          </div>
          <p className="text-white/70 text-sm">{t("footer_tagline")}</p>
        </div>

        {/* ---- Quick links ---- */}
        <div>
          <h3 className="font-semibold mb-3 text-accent-300">{t("footer_links_title")}</h3>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">
              {t("nav_home")}
            </Link>
            <Link to="/upload" className="hover:text-white transition-colors">
              {t("nav_upload")}
            </Link>
            <Link to="/check-rates" className="hover:text-white transition-colors">
              {t("nav_check_rates")}
            </Link>
            <Link to="/dashboard" className="hover:text-white transition-colors">
              {t("nav_dashboard")}
            </Link>
          </div>
        </div>

        {/* ---- Contact / social row (demo links) ---- */}
        <div>
          <h3 className="font-semibold mb-3 text-accent-300">{t("footer_contact_title")}</h3>
          <p className="text-sm text-white/70 mb-3">support@mandipricechecker.example</p>
          <div className="flex gap-3 text-xl">
            <span title="Facebook" className="cursor-pointer hover:opacity-80">📘</span>
            <span title="Twitter / X" className="cursor-pointer hover:opacity-80">🐦</span>
            <span title="Instagram" className="cursor-pointer hover:opacity-80">📷</span>
            <span title="WhatsApp" className="cursor-pointer hover:opacity-80">💬</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 text-center text-white/50 text-xs py-4">
        © {currentYear} Mandi Price Checker. {t("footer_rights")}
      </div>
    </footer>
  );
}

export default Footer;
