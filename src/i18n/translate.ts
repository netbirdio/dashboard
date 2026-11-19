import {
  type AbstractIntlMessages,
  createTranslator,
  type RichTranslationValues,
  type TranslationValues,
} from "use-intl/core";
import { defaultLocale } from "./locales";
import en from "./messages/en.json";

const english = createTranslator({ locale: defaultLocale, messages: en });

export type MessageId = Parameters<typeof english>[0];

export function createTranslations(
  locale: string,
  messages: AbstractIntlMessages,
) {
  const localized = createTranslator({
    locale,
    messages: messages as typeof en,
  });
  // Fall back per message. English fallback retains English plural rules.
  const forMessage = (id: MessageId) =>
    localized.has(id) ? localized : english;
  const translate = (id: MessageId, values?: TranslationValues) =>
    forMessage(id)(id, values);

  return Object.assign(translate, {
    rich: (id: MessageId, values: RichTranslationValues) =>
      forMessage(id).rich(id, values),
  });
}

export const englishTranslations = createTranslations(defaultLocale, en);
