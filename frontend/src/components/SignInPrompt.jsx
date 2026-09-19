// components/SignInPrompt.jsx
// -----------------------------------------------------------------------
// Shown in place of a page that genuinely needs an account.
//
// ---------------------------------------------------------------------
// WHY THIS REPLACED A REDIRECT
// ---------------------------------------------------------------------
// The app used to bounce anyone without an account straight to /login,
// from every single page - including the price pages, which are public
// government data that nobody should have to register to read.
//
// Now only two pages need an account, and when a guest reaches one they
// see THIS instead of being thrown out: the page they asked for, with an
// explanation of why it needs an account and the two buttons to get one.
//
// The difference matters. A redirect discards where they were going; a
// guest who clicks "Upload Receipt", gets dumped on a login screen, and
// signs up then lands on the home page - having lost the thing they came
// to do. `state={{ from }}` on the links below carries the destination
// through, so logging in returns them here.
// -----------------------------------------------------------------------

import { Link, useLocation } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import { LoginIcon, ICON_MD, ICON_STROKE } from "./icons";

function SignInPrompt({ titleKey = "auth_needed_title", reasonKey }) {
  const { t } = useLanguage();
  const location = useLocation();

  // Where to come back to once they are signed in.
  const from = { from: location };

  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center animate-fadeIn">
      <div
        className="grid place-items-center w-12 h-12 rounded-md bg-primary-50
          text-primary-700 mx-auto mb-4"
      >
        <LoginIcon size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </div>

      <h1 className="text-xl font-semibold text-ink-900 mb-2">{t(titleKey)}</h1>

      {/* Says WHY this particular page needs an account, rather than a
          generic "please log in". A farmer who was just told the prices
          are free deserves an explanation of why this one is different. */}
      {reasonKey && (
        <p className="text-sm text-ink-600 leading-relaxed mb-6">{t(reasonKey)}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          to="/login"
          state={from}
          className="px-5 py-2.5 rounded-md bg-primary-600 text-primary-foreground
            text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          {t("nav_login")}
        </Link>
        <Link
          to="/signup"
          state={from}
          className="px-5 py-2.5 rounded-md border border-surface-300 text-ink-700
            text-sm font-medium hover:bg-surface-100 transition-colors"
        >
          {t("nav_signup")}
        </Link>
      </div>

      {/* The way out. Without this the page is a dead end for someone who
          only wanted to look at prices. */}
      <Link
        to="/check-rates"
        className="inline-block mt-6 text-sm text-primary-700 hover:underline"
      >
        {t("auth_browse_instead")}
      </Link>
    </div>
  );
}

export default SignInPrompt;
