"use client";

import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n, isLanguage, languageStorageKey } from "./config";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [i18n] = useState(createI18n);

  useEffect(() => {
    // Restore after hydration; the static export and the first client render
    // must both use English, regardless of the browser's language.
    try {
      const saved = localStorage.getItem(languageStorageKey);
      if (isLanguage(saved)) void i18n.changeLanguage(saved);
    } catch {
      // Storage may be unavailable in private or restricted browser contexts.
    }

    const updateDocument = (language: string) => {
      document.documentElement.lang = language;
    };
    updateDocument(i18n.language);
    i18n.on("languageChanged", updateDocument);

    const syncLanguage = (event: StorageEvent) => {
      if (event.key === languageStorageKey || event.key === null) {
        void i18n.changeLanguage(
          isLanguage(event.newValue) ? event.newValue : "en",
        );
      }
    };
    window.addEventListener("storage", syncLanguage);
    return () => {
      i18n.off("languageChanged", updateDocument);
      window.removeEventListener("storage", syncLanguage);
    };
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
