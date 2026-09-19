// components/CedaAttribution.jsx
// -----------------------------------------------------------------------
// The data-source credit CEDA's terms of use require.
//
// It must appear wherever CEDA data is shown, so it lives in one
// component rather than being pasted onto each page - that way it
// cannot be updated in one place and left stale in another, and it
// cannot be quietly dropped when someone refactors a page.
//
// ---------------------------------------------------------------------
// ABOUT THE LOGO
// ---------------------------------------------------------------------
// This renders a small "CEDA" wordmark drawn in CSS, not CEDA's actual
// logo file. Two reasons:
//
//   1. Hot-linking an image from ceda.ashoka.edu.in would put their
//      server in the load path of our page, and would break silently
//      the day they reorganise their assets.
//
//   2. Their logo is their trademark. Shipping a copy is a licensing
//      question for a person to answer, not something to assume.
//
// If you have permission and the file, drop it at
// `frontend/public/ceda-logo.png` and it will be used automatically -
// the <img> below falls back to the wordmark when the file is absent.
// The required text credit and link are present either way.
// -----------------------------------------------------------------------

import { useState } from "react";

function CedaAttribution({ className = "" }) {
  // Whether the optional logo file exists. We find out by trying to
  // load it; onError flips this and we fall back to the wordmark.
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className={`flex items-center justify-end gap-2 text-[11px] text-ink-400 ${className}`}>
      {!logoFailed ? (
        <img
          src="/ceda-logo.png"
          alt="CEDA"
          className="h-5 w-auto opacity-80"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-ink-100 text-ink-600
            font-semibold tracking-wide text-[10px]"
          aria-hidden="true"
        >
          CEDA
        </span>
      )}

      <span>
        Data source:{" "}
        <a
          href="https://ceda.ashoka.edu.in"
          target="_blank"
          // noopener/noreferrer: without them the opened page gets a
          // handle on ours through window.opener and can navigate it.
          rel="noopener noreferrer"
          className="text-primary-700 hover:text-primary-800 hover:underline font-medium"
        >
          Centre for Economic Data &amp; Analysis, Ashoka University
        </a>
      </span>
    </div>
  );
}

export default CedaAttribution;
