"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { ChevronDown, Languages } from "lucide-react";
import React from "react";
import { isLanguage, languages, languageStorageKey } from "./config";
import { useTranslation } from "./useTranslation";

export function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (value: string) => {
    if (!isLanguage(value)) return;
    void i18n.changeLanguage(value);
    try {
      localStorage.setItem(languageStorageKey, value);
    } catch {
      // Changing the language still works when persistence is unavailable.
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("Language")}
          title={t("Language")}
          className="flex min-h-10 w-full max-w-sm items-center gap-3 rounded-md border border-nb-gray-700 px-3 py-2 text-sm text-nb-gray-300 hover:text-white focus-visible:outline focus-visible:outline-2"
        >
          <Languages size={16} aria-hidden />
          <span
            className="flex-1 text-left"
            lang={i18n.resolvedLanguage ?? "en"}
          >
            {
              languages[
                isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en"
              ]
            }
          </span>
          <ChevronDown size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
      >
        <DropdownMenuRadioGroup
          value={i18n.resolvedLanguage}
          onValueChange={changeLanguage}
        >
          {Object.entries(languages).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value} lang={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
