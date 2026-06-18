import { getRequestConfig } from 'next-intl/server';
import en from './messages/en';
import zh from './messages/zh';

const messages = { en, zh };

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale || 'zh';
  return {
    locale: resolvedLocale,
    messages: messages[resolvedLocale as keyof typeof messages] || messages.zh
  };
});
