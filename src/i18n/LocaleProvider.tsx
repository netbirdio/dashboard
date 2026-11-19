"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getLocalePreference,
  getServerLocale,
  setLocalePreference,
  subscribeToLocale,
} from "./locale-preference";
import { defaultLocale, type Locale, locales } from "./locales";
import { createTranslations, englishTranslations } from "./translate";

const LocaleContext = createContext({
  locale: defaultLocale as Locale,
  setLocale: setLocalePreference,
  t: englishTranslations,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocalePreference,
    getServerLocale,
  );

  useEffect(() => {
    const html = document.documentElement;
    const previousLanguage = html.lang;
    const previousDirection = html.dir;
    html.lang = locale;
    html.dir = locales[locale].direction;
    return () => {
      html.lang = previousLanguage;
      html.dir = previousDirection;
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocalePreference,
      t:
        locale === defaultLocale
          ? englishTranslations
          : createTranslations(locale, locales[locale].messages),
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useDashboardLocale() {
  return useContext(LocaleContext);
}

export function useTranslations() {
  return useDashboardLocale().t;
}
