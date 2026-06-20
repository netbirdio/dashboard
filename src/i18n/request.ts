import { getRequestConfig } from "next-intl/server";

import { defaultLocale, messages, type Locale } from "./config";

/**
 * next-intl request config (referenced from `next.config.js`).
 *
 * NOTE: the app is statically exported (`output: "export"`), so there is no
 * server runtime. This runs only at build time to emit the default bundle.
 * Runtime locale detection is client-side (cookie → browser → default) in
 * {@link '../contexts/LocaleProvider'}.
 */
export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale: Locale =
    locale === "en" || locale === "zh" ? locale : defaultLocale;
  return {
    locale: resolvedLocale,
    messages: messages[resolvedLocale],
  };
});
