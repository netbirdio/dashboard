import "dayjs/locale/de";
import "dayjs/locale/es";
import "dayjs/locale/fr";
import "dayjs/locale/hu";
import "dayjs/locale/it";
import "dayjs/locale/ja";
import "dayjs/locale/pt";
import "dayjs/locale/ru";
import "dayjs/locale/uk";
import "dayjs/locale/zh-cn";
import { isLanguage } from "./config";

// Day.js uses lowercase locale identifiers (notably zh-cn).
// Apply these per date instance, never through the global dayjs.locale setter.
export function dateLocale(language: string | undefined) {
  return isLanguage(language) ? language.toLowerCase() : "en";
}
