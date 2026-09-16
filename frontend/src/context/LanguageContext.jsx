// context/LanguageContext.jsx
// -----------------------------------------------------------------------
// Decides WHICH language the app is showing, and hands every component a
// `t()` function to look words up with.
//
// The words themselves live in src/i18n/translations.js - this file is
// just the logic. Usage anywhere in the app:
//
//     const { t } = useLanguage();
//     <h1>{t("hero_title")}</h1>
//
// ---------------------------------------------------------------------
// TWO RULES THIS FILE ENFORCES
// ---------------------------------------------------------------------
// 1. ENGLISH IS THE DEFAULT. A farmer who has never touched the language
//    dropdown sees English. Their choice is remembered in localStorage,
//    so it survives a refresh.
//
// 2. THE ADMIN SIDE IS ALWAYS ENGLISH. The admin panel is for one
//    operator, not for farmers across eleven states, so translating it
//    would be work nobody benefits from. More practically: the admin
//    pages are written in plain English anyway, so letting the navbar
//    switch to Tamil would produce a half-Tamil, half-English screen -
//    worse than either.
//
//    This is handled by `effectiveLanguage` below: an admin always reads
//    English, no matter what is saved in localStorage. That matters
//    because a farmer and an admin can share a browser - without this,
//    an admin logging in after a Marathi-speaking farmer would inherit
//    their language.
//
//    NOTE this is why AuthProvider must wrap LanguageProvider in
//    App.jsx: we need to know WHO is logged in before we can decide what
//    language to show them.
// -----------------------------------------------------------------------

import { createContext, useContext, useState } from "react";
import { translations, LANGUAGES, DEFAULT_LANGUAGE } from "../i18n/translations";
import { useAuth } from "./AuthContext";

const LanguageContext = createContext(null);

const STORAGE_KEY = "mandi_language";

export function LanguageProvider({ children }) {
  // Which language the USER picked. Admins have this overridden below.
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Only accept a saved value we actually still support - if someone
    // has an old code in localStorage from a language we removed, fall
    // back to English rather than showing a blank page.
    const isSupported = LANGUAGES.some((l) => l.code === saved);
    return isSupported ? saved : DEFAULT_LANGUAGE;
  });

  const { isAdmin } = useAuth();

  // ---- Rule 2: admins always read English ----
  const effectiveLanguage = isAdmin ? DEFAULT_LANGUAGE : language;

  // Called by the dropdown in the navbar.
  function setLanguage(code) {
    // Ignore anything not in our list, so a bad value can't break t().
    if (!LANGUAGES.some((l) => l.code === code)) return;

    setLanguageState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  /**
   * Looks up one piece of text in the current language.
   *
   * If a key is missing from a translation (easy to happen when you add
   * new text and only fill in some languages), we fall back to ENGLISH
   * rather than showing the raw key. A farmer seeing one English line in
   * an otherwise Marathi page can still use the app; a farmer seeing
   * "hero_title" cannot.
   */
  function t(key) {
    const activeSet = translations[effectiveLanguage] || translations[DEFAULT_LANGUAGE];
    return activeSet[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  }

  const value = {
    language: effectiveLanguage,
    setLanguage,
    t,
    // The list the navbar dropdown builds itself from.
    languages: LANGUAGES,
    // Lets the navbar hide the language picker entirely for admins.
    canChangeLanguage: !isAdmin,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// A small helper hook so components can do:
//   const { t, language, setLanguage } = useLanguage();
export function useLanguage() {
  return useContext(LanguageContext);
}
