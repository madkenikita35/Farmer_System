// components/CountUpStat.jsx
// -----------------------------------------------------------------------
// Shows a big number that "counts up" from 0 to its target value when it
// first appears on screen (a common trick on production landing pages
// to make stats feel more alive). Built with just `useState` +
// `useEffect` - no animation library needed.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";

function CountUpStat({ target, label, suffix = "" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const durationMs = 1500; // how long the count-up should take
    const stepMs = 30; // how often we update the number
    const totalSteps = durationMs / stepMs;
    const incrementPerStep = target / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep += 1;
      const nextValue = Math.min(Math.round(incrementPerStep * currentStep), target);
      setDisplayValue(nextValue);

      if (currentStep >= totalSteps) {
        clearInterval(timer);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-extrabold text-primary-700">
        {displayValue.toLocaleString("en-IN")}
        {suffix}
      </p>
      <p className="text-sm text-ink-500 mt-1">{label}</p>
    </div>
  );
}

export default CountUpStat;
