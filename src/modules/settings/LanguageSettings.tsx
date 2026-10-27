"use client";

import { LanguageSelector } from "@/i18n/LanguageSelector";
import { useTranslation } from "@/i18n/useTranslation";

export default function LanguageSettings() {
  const { t } = useTranslation();
  return (
    <section className="p-default py-6 max-w-2xl">
      <h1>{t("Language")}</h1>
      <p className="mb-6 mt-2 text-sm text-nb-gray-300">
        {t(
          "Choose the dashboard language. Your selection is saved in this browser and applies immediately.",
        )}
      </p>
      <LanguageSelector />
    </section>
  );
}
