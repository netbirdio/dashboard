"use client";

import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  defaultLocale,
  Locale,
  locales,
  MessageKey,
  messages,
} from "./messages";

type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  locales: readonly Locale[];
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function I18nProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocale] = useLocalStorage<Locale>(
    "netbird-locale",
    defaultLocale,
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    dayjs.locale(locale === "zh-CN" ? "zh-cn" : "en");
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      locales,
      setLocale,
      t: (key, values) => {
        const localeMessages = messages[locale] as Record<string, string>;
        const enMessages = messages.en as Record<string, string>;
        const message = localeMessages[key] ?? enMessages[key] ?? key;
        return interpolate(message, values);
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
