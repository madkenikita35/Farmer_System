// components/MandiGallery.jsx
// -----------------------------------------------------------------------
// A photo carousel showing the journey a crop makes: the field, the
// harvest, the mandi, the sale.
//
// It shows THREE photos side by side on a wide screen and one on a
// phone, and steps along one photo at a time. That's different from the
// hero carousel (one big photo, cross-fading), which is why it's a
// separate component rather than an option on that one - trying to make
// a single carousel do both jobs would make both harder to read.
//
// EVERY IMAGE URL HERE WAS CHECKED TO LOAD before being added. Even so,
// each has an emoji-and-gradient fallback: these photos come from an
// external site, and a farmer on a weak rural connection may never
// receive them. A coloured panel is a perfectly good substitute; a row
// of broken-image icons is not.
//
// The captions are deliberately about the JOURNEY ("In the field",
// "At the mandi") rather than naming a specific crop - we can't
// guarantee which crop a given stock photo actually shows, and a
// caption that confidently names the wrong one would be worse than a
// general one.
// -----------------------------------------------------------------------

import { useEffect, useState } from "react";

const photos = [
  {
    url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&q=80&auto=format&fit=crop",
    label: "In the field",
    emoji: "🌾",
    from: "from-lime-400",
    to: "to-green-600",
  },
  {
    url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80&auto=format&fit=crop",
    label: "Ready to harvest",
    emoji: "🚜",
    from: "from-amber-400",
    to: "to-orange-600",
  },
  {
    url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=900&q=80&auto=format&fit=crop",
    label: "At the mandi",
    emoji: "🏛️",
    from: "from-emerald-400",
    to: "to-teal-600",
  },
  {
    url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=900&q=80&auto=format&fit=crop",
    label: "Weighed and graded",
    emoji: "⚖️",
    from: "from-red-400",
    to: "to-rose-600",
  },
  {
    url: "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=900&q=80&auto=format&fit=crop",
    label: "Sold at a fair price",
    emoji: "🤝",
    from: "from-sky-400",
    to: "to-blue-600",
  },
  {
    url: "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=900&q=80&auto=format&fit=crop",
    label: "Back to the farm",
    emoji: "🏡",
    from: "from-violet-400",
    to: "to-indigo-600",
  },
];

function MandiGallery({ t }) {
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedUrls, setFailedUrls] = useState([]);

  // Step along one photo every 3.5 seconds.
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setStartIndex((current) => (current + 1) % photos.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, startIndex]);

  // Build the three photos to show right now. The `% photos.length`
  // wraps us back to the beginning, so after the last photo we get the
  // first one again rather than running off the end of the array.
  const visible = [0, 1, 2].map((offset) => photos[(startIndex + offset) % photos.length]);

  function handleError(url) {
    setFailedUrls((previous) => (previous.includes(url) ? previous : [...previous, url]));
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-ink-900">{t("gallery_title")}</h2>
        <p className="text-ink-500">{t("gallery_subtitle")}</p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {visible.map((photo, position) => (
          <figure
            // Keying on the photo URL (not the position) makes React
            // treat each arriving photo as a NEW element, so the
            // fade-in animation replays every time the strip advances.
            key={photo.url}
            className={`relative h-52 rounded-2xl overflow-hidden shadow-md hover-zoom hover-lift animate-fadeIn stagger-${position + 1}`}
          >
            {failedUrls.includes(photo.url) ? (
              <div
                className={`w-full h-full bg-gradient-to-br ${photo.from} ${photo.to} flex items-center justify-center`}
              >
                <span className="text-6xl animate-float">{photo.emoji}</span>
              </div>
            ) : (
              <img
                src={photo.url}
                alt={photo.label}
                loading="lazy"
                onError={() => handleError(photo.url)}
                className="w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <figcaption className="absolute bottom-3 left-4 right-4 text-white font-semibold drop-shadow">
              <span className="mr-1.5">{photo.emoji}</span>
              {photo.label}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Dots let you jump around, and show where you are in the loop. */}
      <div className="flex justify-center gap-2 mt-5">
        {photos.map((photo, index) => (
          <button
            key={photo.url}
            onClick={() => setStartIndex(index)}
            aria-label={`Show ${photo.label}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === startIndex
                ? "bg-brand-green w-6"
                : "bg-gray-300 w-2 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default MandiGallery;
