// pages/Home.jsx
// -----------------------------------------------------------------------
// The landing page. Compared to a basic version, this page adds:
//   - An image carousel/slider in the hero banner (HeroCarousel)
//   - Animated "count up" stats (CountUpStat)
//   - A testimonials slider (TestimonialSlider)
//   - Scroll-in animations on each section (FadeInSection)
//   - Full English/Marathi translation via the `t()` function
//
// The overall page structure (hero -> two option cards -> how it works)
// is the same as before, just visually upgraded.
// -----------------------------------------------------------------------

import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import HeroCarousel from "../components/HeroCarousel";
import CropTicker from "../components/CropTicker";
import MandiGallery from "../components/MandiGallery";
import TestimonialSlider from "../components/TestimonialSlider";
import CountUpStat from "../components/CountUpStat";
import FadeInSection from "../components/FadeInSection";
import {
  ICON_MD,
  ICON_LG,
  ICON_STROKE,
  ChartIcon,
  ReceiptIcon,
  SearchIcon,
  UploadIcon,
} from "../components/icons";

function Home() {
  const { t } = useLanguage();

  return (
    <div>
      {/* ================= HERO SECTION ================= */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-4">
        <div className="grid md:grid-cols-2 gap-10 items-center">
      {/* ---- Left: headline + buttons ---- */}
          <div className="text-center md:text-left animate-fadeInLeft">
            <span className="inline-flex items-center gap-1.5 bg-accent-100 text-accent-800 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4 ring-1 ring-accent-200">{t("hero_badge")}
            </span>
            <h1 className="text-3xl sm:text-3xl font-bold text-ink-900 mb-4 leading-[1.1] tracking-tight animate-fadeInUp stagger-1">{t("hero_title")}
            </h1>
            <p className="text-ink-600 text-lg leading-relaxed mb-7 animate-fadeInUp stagger-2">{t("hero_subtitle")}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start animate-fadeInUp stagger-3">
              <Link
                to="/check-rates"className="bg-secondary-gradient text-secondary-foreground font-medium px-7 py-3.5 rounded-lg shadow-soft text-center hover-lift">
                <SearchIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("hero_cta_primary")}
              </Link>
              <Link
                to="/upload"className="bg-primary-gradient text-primary-foreground font-medium px-7 py-3.5 rounded-lg shadow-soft text-center hover-lift">
                <UploadIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("hero_cta_secondary")}
              </Link>
            </div>
          </div>
      {/* ---- Right: the image carousel/slider ---- */}
          <HeroCarousel t={t} />
        </div>
      </div>
      {/* ================= STATS STRIP ================= */}
      <FadeInSection className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-card rounded-lg shadow-soft border border-surface-300/60 grid grid-cols-2 sm:grid-cols-4 gap-6 py-9 px-6">
          <CountUpStat target={12500} suffix="+" label={t("stats_farmers")} />
          <CountUpStat target={38000} suffix="+" label={t("stats_receipts")} />
          <CountUpStat target={50} suffix="+" label={t("stats_crops")} />
          <CountUpStat target={210} suffix="+" label={t("stats_mandis")} />
        </div>
      </FadeInSection>
      {/* ================= CROP TICKER (endless scrolling strip) ================= */}
      <FadeInSection className="max-w-6xl mx-auto px-6 py-10">
        <CropTicker t={t} />
      </FadeInSection>
      {/* ================= TWO MAIN OPTION CARDS ================= */}
      <FadeInSection className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid sm:grid-cols-2 gap-6 text-left">
          <OptionCard
            icon={UploadIcon}
            title={t("option_upload_title")}
            text={t("option_upload_text")}
            linkTo="/upload"linkLabel={t("option_upload_link")}
            buttonClass="bg-primary-gradient text-primary-foreground"/>
          <OptionCard
            icon={SearchIcon}
            title={t("option_check_title")}
            text={t("option_check_text")}
            linkTo="/check-rates"linkLabel={t("option_check_link")}
            buttonClass="bg-secondary-gradient text-secondary-foreground"/>
        </div>

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary-700 font-medium px-5 py-2.5 rounded-full bg-primary-50 ring-1 ring-primary-200 hover:bg-primary-100 transition-all">
            <ChartIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {t("view_dashboard")} 
          </Link>
        </div>
      </FadeInSection>
      {/* ================= HOW IT WORKS ================= */}
      <FadeInSection className="max-w-5xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold text-ink-900">{t("how_it_works_title")}</h2>
          <p className="text-ink-500 mt-1">{t("how_it_works_subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 text-left">
          <FeatureCard icon={ReceiptIcon} title={t("step1_title")} text={t("step1_text")} />
          <FeatureCard icon={SearchIcon} title={t("step2_title")} text={t("step2_text")} />
          <FeatureCard icon={ChartIcon} title={t("step3_title")} text={t("step3_text")} />
        </div>
      </FadeInSection>
      {/* ================= PHOTO GALLERY: farm -> mandi ================= */}
      <FadeInSection className="max-w-6xl mx-auto px-6 py-12">
        <MandiGallery t={t} />
      </FadeInSection>
      {/* ================= TESTIMONIALS ================= */}
      <FadeInSection className="bg-card border-y border-surface-300/60 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-ink-900 text-center mb-10">{t("testimonials_title")}
          </h2>
          <TestimonialSlider t={t} />
        </div>
      </FadeInSection>
    </div>
  );
}

// One of the two big call-to-action cards.
function OptionCard({ icon: Icon, title, text, linkTo, linkLabel, buttonClass }) {
  return (
    <div className="bg-card rounded-lg shadow-soft p-8 border border-surface-300/60 flex flex-col hover-lift animate-popIn">
      <div className="text-primary-700 mb-3">
        <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-ink-900 mb-2">{title}</h2>
      <p className="text-ink-600 text-sm leading-relaxed mb-6 flex-1">{text}</p>
      <Link
        to={linkTo}
        className={`${buttonClass} font-medium px-6 py-3.5 rounded-lg shadow-soft transition-all text-center hover:scale-[1.02]`}
      >{linkLabel}
      </Link>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="bg-card rounded-lg shadow-soft p-6 border border-surface-300/60 hover-lift animate-popIn">
      {/* Static on purpose. These three icons used to drift up and
          down forever (animate-float). On a page you are meant to READ,
          permanent motion next to the text pulls the eye away from the
          words - and there is nothing here that movement was explaining.
          The card still lifts on hover, which is motion that answers a
          question. */}
      <div className="text-primary-700 mb-2">
        <Icon size={ICON_LG} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </div>
      <h3 className="font-medium text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-ink-500 leading-relaxed">{text}</p>
    </div>
  );
}

export default Home;
