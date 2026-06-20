/**
 * Cookie-based locale detection helpers (pure, side-effect-isolated).
 *
 * Detection order in {@link detectLocale}:
 *   1. Explicitly stored cookie (`NEXT_LOCALE`) — user's last choice wins.
 *   2. Browser language (`navigator.language`) — best-effort match.
 *   3. {@link defaultLocale}.
 *
 * Because the app is statically exported, all of this runs in the browser.
 * Every function is a no-op safe to call during SSR/build (returns the
 * default when DOM/cookie APIs are unavailable), preventing hydration
 * mismatches.
 */

import Cookies from "js-cookie";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  defaultLocale,
  locales,
  type Locale,
} from "./config";

/** True when `value` is one of the supported {@link locales}. */
export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** `true` when executing in a browser environment with the DOM available. */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Normalize a raw language tag (e.g. `"zh-CN"`, `"en-US"`, `"en"`) to a
 * supported locale. Returns `undefined` when no supported locale can be
 * derived. Both the full tag and the primary subtag are considered, so
 * `"zh-CN"` → `"zh"` and `"en-US"` → `"en"`.
 */
export function matchLocale(tag: string | undefined): Locale | undefined {
  if (!tag) return undefined;
  const lower = tag.toLowerCase();
  if (isSupportedLocale(lower)) return lower;

  const primary = lower.split(/[-_]/)[0];
  if (isSupportedLocale(primary)) return primary;
  return undefined;
}

/** Read the stored locale cookie, or `undefined` if unset/invalid. */
export function getCookieLocale(): Locale | undefined {
  if (!isBrowser()) return undefined;
  return matchLocale(Cookies.get(LOCALE_COOKIE));
}

/**
 * Detect the locale from the browser's language preferences
 * (`navigator.languages` then `navigator.language`).
 * Returns {@link defaultLocale} when nothing usable is available.
 */
export function detectBrowserLocale(): Locale {
  if (!isBrowser()) return defaultLocale;

  const candidates = [...(window.navigator?.languages ?? [])];
  const language = window.navigator?.language;
  if (language) candidates.push(language);

  for (const candidate of candidates) {
    const matched = matchLocale(candidate);
    if (matched) return matched;
  }
  return defaultLocale;
}

/**
 * Resolve the active locale. Cookie wins; browser language is the fallback;
 * {@link defaultLocale} is the last resort.
 */
export function detectLocale(): Locale {
  return getCookieLocale() ?? detectBrowserLocale();
}

/**
 * Persist `locale` as the active locale cookie so subsequent loads keep the
 * user's choice. No-op outside the browser.
 */
export function persistLocale(locale: Locale): void {
  if (!isBrowser()) return;
  Cookies.set(LOCALE_COOKIE, locale, {
    expires: LOCALE_COOKIE_MAX_AGE / (60 * 60 * 24), // days
    sameSite: "lax",
    path: "/",
  });
}
