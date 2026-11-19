import {
  defaultLocale,
  isLocale,
  type Locale,
  localeStorageKey,
} from "./locales";

const listeners = new Set<() => void>();
let temporaryLocale: Locale | undefined;

export function getServerLocale(): Locale {
  return defaultLocale;
}

export function getLocalePreference(): Locale {
  if (temporaryLocale) return temporaryLocale;

  try {
    const stored = window.localStorage.getItem(localeStorageKey);
    if (stored && isLocale(stored)) return stored;
  } catch {
    // Storage can be unavailable in private or embedded browsing sessions.
  }

  return defaultLocale;
}

export function setLocalePreference(locale: Locale) {
  try {
    window.localStorage.setItem(localeStorageKey, locale);
    temporaryLocale = undefined;
  } catch {
    temporaryLocale = locale;
  }
  for (const listener of listeners) listener();
}

export function subscribeToLocale(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      (event.key === localeStorageKey || event.key === null)
    ) {
      temporaryLocale = undefined;
      listener();
    }
  };

  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(listener);
  };
}
