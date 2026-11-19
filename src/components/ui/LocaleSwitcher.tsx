"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { GlobeIcon } from "lucide-react";
import { useDashboardLocale } from "@/i18n/LocaleProvider";
import { isLocale, localeIds, locales } from "@/i18n/locales";

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useDashboardLocale();

  return (
    <DropdownMenu modal={false} dir={locales[locale].direction}>
      <DropdownMenuTrigger asChild>
        <Button
          size="xs"
          variant="default-outline"
          aria-label={t("language.select")}
          className="!rounded-full h-[38px] w-[38px] !p-0"
        >
          <GlobeIcon size={18} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[60vh] min-w-40 overflow-y-auto"
      >
        <DropdownMenuLabel>{t("language.select")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (isLocale(value)) setLocale(value);
          }}
        >
          {localeIds.map((id) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              textValue={locales[id].label}
            >
              <span lang={id} dir={locales[id].direction}>
                {locales[id].label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
