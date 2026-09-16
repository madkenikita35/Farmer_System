// components/TestimonialSlider.jsx
// -----------------------------------------------------------------------
// Shows one farmer testimonial (quote) at a time, and automatically
// fades to the next one every few seconds. Same pattern as
// HeroCarousel.jsx: `useState` for "which one is showing" + `useEffect`
// with `setInterval` to advance it automatically.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";

// Each testimonial's text/name/role comes from the translation dictionary
// (see context/LanguageContext.jsx) so it can show in English or Marathi.
const testimonialKeys = [
  { textKey: "testimonial_1_text", nameKey: "testimonial_1_name", roleKey: "testimonial_1_role", emoji: "🧑‍🌾" },
  { textKey: "testimonial_2_text", nameKey: "testimonial_2_name", roleKey: "testimonial_2_role", emoji: "👩‍🌾" },
  { textKey: "testimonial_3_text", nameKey: "testimonial_3_name", roleKey: "testimonial_3_role", emoji: "🧑‍🌾" },
];

function TestimonialSlider({ t }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonialKeys.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const active = testimonialKeys[activeIndex];

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-surface-300/60 p-8 max-w-2xl mx-auto text-center">
      {/* key={activeIndex} makes React re-mount this div on every change,
          which re-triggers the fade-in animation each time the quote changes. */}
      <div key={activeIndex} className="animate-fadeIn">
        <div className="text-4xl mb-4">{active.emoji}</div>
        <p className="text-gray-700 text-lg italic mb-4">"{t(active.textKey)}"</p>
        <p className="font-semibold text-ink-900">{t(active.nameKey)}</p>
        <p className="text-sm text-ink-500">{t(active.roleKey)}</p>
      </div>

      {/* Dots to jump between testimonials */}
      <div className="flex justify-center gap-2 mt-6">
        {testimonialKeys.map((item, index) => (
          <button
            key={item.textKey}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show testimonial ${index + 1}`}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              index === activeIndex ? "bg-brand-green w-6" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default TestimonialSlider;
