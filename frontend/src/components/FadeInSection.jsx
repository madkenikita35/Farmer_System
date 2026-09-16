// components/FadeInSection.jsx
// -----------------------------------------------------------------------
// Wrap any block of content in <FadeInSection> and it will fade + slide
// upward into view the first time the user scrolls down to it, instead
// of just appearing instantly. This is a very common "polish" touch on
// production landing pages.
//
// HOW IT WORKS:
//   The browser's built-in `IntersectionObserver` tells us the exact
//   moment an element becomes visible on screen. We start the element
//   as invisible (opacity 0), and once the observer says "this is now
//   visible", we add a CSS class that animates it in.
// -----------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

function FadeInSection({ children, className = "" }) {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // only need to animate in once
        }
      },
      { threshold: 0.15 } // trigger once 15% of the section is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`${className} transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}

export default FadeInSection;
