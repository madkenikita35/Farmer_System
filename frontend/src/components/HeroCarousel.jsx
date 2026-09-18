// components/HeroCarousel.jsx
// -----------------------------------------------------------------------
// The auto-playing image slider in the homepage hero banner.
//
// No carousel library is used - just React's `useState` (to remember
// which slide is showing) and `useEffect` (to advance it on a timer).
// That keeps the whole thing readable in one screen.
//
// WHAT MAKES IT FEEL LIKE A REAL SITE RATHER THAN A SLIDESHOW:
//   - a slow zoom on the active photo (the "Ken Burns" effect), so the
//     banner is never completely still
//   - a progress bar showing when the next slide is due
//   - it pauses while your cursor is on it, so you can actually read
//     a caption instead of chasing it
//   - the caption slides up as each photo arrives
//
// HOW TO ADD OR CHANGE A SLIDE:
//   Edit the `slides` array below. Each slide needs an image URL, a
//   caption key (from src/i18n/translations.js) and a fallback emoji.
//   Nothing else has to change.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";

// How long each slide stays on screen, in milliseconds. The progress bar
// is told the same number so the two always stay in step - if you change
// it here, the bar follows automatically.
const SLIDE_DURATION_MS = 5000;

// Farming and mandi photographs. `fallbackEmoji` and `fallbackFrom/To`
// are used to paint a coloured panel if the photo fails to load - see
// the note on `hasFailed` below.
const slides = [
  {
    imageUrl:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&q=80&auto=format&fit=crop",
    captionKey: "hero_slide_1_caption",
    fallbackEmoji: "🌾",
    fallbackFrom: "from-warning-400",
    fallbackTo: "to-yellow-600",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1600&q=80&auto=format&fit=crop",
    captionKey: "hero_slide_2_caption",
    fallbackEmoji: "🧑‍🌾",
    fallbackFrom: "from-positive-500",
    fallbackTo: "to-emerald-700",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=1600&q=80&auto=format&fit=crop",
    captionKey: "hero_slide_3_caption",
    fallbackEmoji: "🧾",
    fallbackFrom: "from-orange-400",
    fallbackTo: "to-negative-500",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=80&auto=format&fit=crop",
    captionKey: "hero_slide_4_caption",
    fallbackEmoji: "📈",
    fallbackFrom: "from-info-500",
    fallbackTo: "to-blue-700",
  },
];

function HeroCarousel({ t }) {
  // Which slide (0, 1, 2, ...) is currently visible.
  const [activeIndex, setActiveIndex] = useState(0);

  // True while the cursor is over the banner - pauses the auto-advance.
  const [isPaused, setIsPaused] = useState(false);

  // Which image URLs failed to load. Photos come from an external site,
  // so on a slow or offline connection they may never arrive. Rather
  // than leaving broken-image icons in the hero, we remember the
  // failures and paint a coloured panel with an emoji instead.
  const [failedImages, setFailedImages] = useState([]);

  // Auto-advance, unless paused.
  useEffect(() => {
    if (isPaused) return; // no timer at all while paused

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SLIDE_DURATION_MS);

    // Cleanup: React runs this before the next effect and on unmount, so
    // we never leave a stray timer running.
    return () => clearInterval(timer);
    // `activeIndex` is in the dependency list so the timer RESTARTS when
    // you click an arrow - otherwise a slide you just chose by hand
    // could vanish after only a fraction of a second.
  }, [isPaused, activeIndex]);

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function goToNext() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  function handleImageError(imageUrl) {
    setFailedImages((previous) =>
      previous.includes(imageUrl) ? previous : [...previous, imageUrl]
    );
  }

  return (
    <div
      className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden shadow-xl animate-fadeInRight"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ---- Slides: all rendered, only the active one visible ---- */}
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        const hasFailed = failedImages.includes(slide.imageUrl);

        return (
          <div
            key={slide.imageUrl}
            className={`absolute inset-0 transition-opacity duration-[900ms] ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
            // Hide inactive slides from screen readers, so they don't
            // read out four captions at once.
            aria-hidden={!isActive}
          >
            {hasFailed ? (
              // The photo didn't load - show a branded panel instead.
              <div
                className={`w-full h-full bg-gradient-to-br ${slide.fallbackFrom} ${slide.fallbackTo} flex items-center justify-center`}
              >
                <span className="text-7xl animate-float">{slide.fallbackEmoji}</span>
              </div>
            ) : (
              <img
                src={slide.imageUrl}
                alt={t(slide.captionKey)}
                onError={() => handleImageError(slide.imageUrl)}
                // `key` on the active state restarts the zoom animation
                // each time this slide comes back around.
                key={isActive ? "active" : "idle"}
                className={`w-full h-full object-cover ${isActive ? "animate-kenBurns" : ""}`}
              />
            )}

            {/* Dark gradient so white caption text stays readable on any photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <p
              className={`absolute bottom-8 left-6 right-6 text-white text-lg sm:text-xl font-semibold drop-shadow-lg ${
                isActive ? "animate-fadeInUp" : ""
              }`}
            >
              {t(slide.captionKey)}
            </p>
          </div>
        );
      })}

      {/* ---- Progress bar showing time until the next slide ---- */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <div
          // Changing the key remounts this div, which restarts the CSS
          // animation from 0% on every slide - the simplest way to
          // replay an animation in React.
          key={`${activeIndex}-${isPaused}`}
          className="h-full bg-white/90 animate-progress"
          style={{
            animationDuration: `${SLIDE_DURATION_MS}ms`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>

      {/* ---- Left / right arrows ---- */}
      <button
        onClick={goToPrevious}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110"
      >
        ‹
      </button>
      <button
        onClick={goToNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110"
      >
        ›
      </button>

      {/* ---- Dots: show which slide is active, and jump to any slide ---- */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.imageUrl}
            onClick={() => setActiveIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === activeIndex ? "bg-card w-7" : "bg-white/50 w-2.5 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroCarousel;
