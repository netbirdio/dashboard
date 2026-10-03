import { createInstance } from "i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hu from "./locales/hu.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import uk from "./locales/uk.json";
import zhCN from "./locales/zh-CN.json";

export const languageStorageKey = "netbird.language";
// Keep codes and native names aligned with the NetBird desktop client.
export const languages = {
  en: "English (US)",
  uk: "Українська",
  de: "Deutsch",
  hu: "Magyar",
  ru: "Русский",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  "zh-CN": "简体中文",
  ja: "日本語",
} as const;
export type Language = keyof typeof languages;

export const catalogs = {
  en,
  uk,
  de,
  hu,
  ru,
  es,
  fr,
  it,
  pt,
  "zh-CN": zhCN,
  ja,
} satisfies Record<Language, Record<keyof typeof en, string>>;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && Object.hasOwn(languages, value);
}

// Each provider owns its instance so server renders never share a user's locale.
export function createI18n() {
  const instance = createInstance();
  void instance.init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: Object.keys(languages),
    resources: Object.fromEntries(
      Object.entries(catalogs).map(([language, catalog]) => [
        language,
        { translation: { ...catalog } },
      ]),
    ),
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
