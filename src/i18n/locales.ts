import { enUS, zhCN } from "react-day-picker/locale";
import type { AbstractIntlMessages } from "use-intl/core";
import en from "./messages/en.json";
import zhHans from "./messages/zh-Hans.json";

export const defaultLocale = "en";
export const localeStorageKey = "netbird-locale";

export const locales = {
  en: {
    label: "English",
    direction: "ltr",
    calendarLocale: enUS,
    messages: en,
  },
  "zh-Hans": {
    label: "简体中文",
    direction: "ltr",
    calendarLocale: zhCN,
    messages: zhHans,
  },
} as const satisfies Record<
  string,
  {
    label: string;
    direction: "ltr" | "rtl";
    calendarLocale: typeof enUS;
    messages: AbstractIntlMessages;
  }
>;

export type Locale = keyof typeof locales;
export const localeIds = Object.keys(locales) as Locale[];

export function isLocale(value: string): value is Locale {
  return Object.hasOwn(locales, value);
}
