/**
 * i18n configuration — single source of truth for locale handling.
 *
 * Shared by:
 *  - {@link './request.ts'}      (next-intl plugin, build-time)
 *  - {@link './detection.ts'}    (cookie + browser locale detection)
 *  - {@link './routing.ts'}      (next-intl routing definition)
 *  - {@link '../contexts/LocaleProvider.tsx'} (runtime provider)
 *
 * NOTE: This app uses `output: "export"` (static export), so there is no
 * server runtime. Locale detection therefore happens entirely on the client
 * via a cookie, with the browser language as a fallback. There is no
 * middleware / `[locale]` route segment.
 */

import en from "./messages/en";
import zh from "./messages/zh";

/** Locales the app ships translations for. */
export const locales = ["en", "zh"] as const;

/** Locale identifier union (e.g. `"en"` | `"zh"`). */
export type Locale = (typeof locales)[number];

/** Locale used when no preference is stored or detectable. */
export const defaultLocale: Locale = "en";

/** Human-readable label for each locale, shown in selectors and switchers. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

/** Message catalog keyed by locale. */
export const messages: Record<Locale, typeof en> = {
  en,
  zh,
};

/** Cookie name used to persist the user's locale choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Cookie max-age in seconds (1 year). */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * A sensible IANA timezone for each locale. Used to seed
 * `NextIntlClientProvider.timeZone` so date formatting matches the
 * user's language when no explicit override is needed.
 */
export const LOCALE_TIMEZONES: Record<Locale, string> = {
  en: "UTC",
  zh: "Asia/Shanghai",
};
