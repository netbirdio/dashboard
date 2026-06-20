"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { Label } from "@components/Label";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import * as Tabs from "@radix-ui/react-tabs";
import { LanguagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { useLocale } from "@/contexts/LocaleProvider";
import { locales, type Locale } from "@/i18n/config";

/** Human-readable label for each locale, shown in the selector. */
const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

const options: SelectOption[] = locales.map((locale) => ({
  value: locale,
  label: LOCALE_LABELS[locale],
}));

/**
 * Settings tab for the user's display language. This is a pure client-side
 * preference (no server round-trip): selecting an option persists a cookie via
 * {@link useLocale.setLocale} and the active locale updates immediately, so the
 * whole dashboard re-renders in the new language on the spot.
 *
 * Rendered with `<Tabs.Content value="language">` so it shows only when the
 * "language" tab is active in the settings page. Unlike most settings tabs it
 * is intentionally available to every logged-in user (not gated by
 * `permission.settings.read`), since language is a personal preference.
 */
export default function LanguageTab() {
  const t = useTranslations("settings");
  const { locale, setLocale } = useLocale();

  return (
    <Tabs.Content value={"language"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=language"}
            label={t("language")}
            icon={<LanguagesIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>{t("language")}</h1>

        <div className={"flex flex-col gap-4 w-full mt-8"}>
          <div className={"flex flex-col gap-2"}>
            <Label>{t("currentLanguage")}</Label>
            <SelectDropdown
              value={locale}
              onChange={(value) => setLocale(value as Locale)}
              options={options}
            />
          </div>
          <p className={"text-sm text-nb-gray-400"}>
            {t("languageDescription")}
          </p>
        </div>
      </div>
    </Tabs.Content>
  );
}
