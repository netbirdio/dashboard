"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { cn } from "@utils/helpers";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/contexts/LocaleProvider";
import { locales, type Locale } from "@/i18n/config";
import { useTranslations } from "next-intl";

/** Human-readable label for each locale, shown in the switcher. */
const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

/**
 * Header control that switches the active locale. Writes the choice to the
 * `NEXT_LOCALE` cookie (via {@link useLocale}) so it persists across reloads
 * and is picked up by {@link LocaleProvider} on the next load.
 *
 * Renders nothing until client-side detection has run, to avoid showing a
 * stale/default selection during hydration.
 */
export default function LocaleSwitcher() {
  const t = useTranslations("common");

  const { locale, setLocale, mounted } = useLocale();
  const [open, setOpen] = useState(false);

  if (!mounted) {
    // Reserve space without committing a potentially-wrong label pre-hydration.
    return (
      <Button
        size={"xs"}
        variant={"default-outline"}
        className={cn("!rounded-full h-[38px] w-[38px] !p-0")}
        aria-label={t("selectLanguage")}
        disabled
      >
        <GlobeIcon size={18} />
      </Button>
    );
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild={true}>
        <Button
          size={"xs"}
          variant={"default-outline"}
          className={cn(
            "!rounded-full h-[38px] w-[38px] !p-0",
            open && "text-white",
          )}
          aria-label={t("selectLanguage")}
        >
          <GlobeIcon size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-normal leading-none text-nb-gray-200 py-1 px-1">
            {t("language")}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((option) => {
          const active = option === locale;
          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => {
                setLocale(option);
                setOpen(false);
              }}
            >
              <div className={"flex gap-3 items-center"}>
                {LOCALE_LABELS[option]}
              </div>
              {active && (
                <DropdownMenuShortcut>
                  <CheckIcon size={16} />
                </DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
