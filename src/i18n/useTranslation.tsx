"use client";

import { useContext } from "react";
import {
  I18nContext,
  useTranslation as useI18nextTranslation,
} from "react-i18next";
import { createI18n } from "./config";

// Standalone components (including existing tests) retain their English output.
const english = createI18n();

export function useTranslation() {
  const context = useContext(I18nContext);
  return useI18nextTranslation(undefined, { i18n: context?.i18n ?? english });
}

// Static column definitions can render translated text without calling hooks
// outside a component. This also subscribes them to language changes.
export function T({ children }: { children: string }) {
  const { t } = useTranslation();
  return t(children);
}
