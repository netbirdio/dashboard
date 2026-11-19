"use client";

import { cn } from "@utils/helpers";
import { CheckIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { englishTranslations, type MessageId } from "@/i18n/translate";

// StatusPicker — three-way radio that maps to the `connected` column.
//   undefined → All
//   true      → Online
//   false     → Offline
type Option = {
  value: boolean | undefined;
  labelId: MessageId;
  dotClass: string;
};

const OPTIONS: Option[] = [
  { value: undefined, labelId: "common.all", dotClass: "bg-nb-gray-500" },
  { value: true, labelId: "common.online", dotClass: "bg-green-500" },
  { value: false, labelId: "common.offline", dotClass: "bg-nb-gray-700" },
];

type Props = {
  value: boolean | undefined;
  onChange: (next: boolean | undefined) => void;
  close: () => void;
};

export function StatusPicker({ value, onChange, close }: Props) {
  const t = useTranslations();
  return (
    <div className={"flex flex-col gap-0.5"}>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.labelId}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors",
              "text-nb-gray-300 hover:bg-nb-gray-900 hover:text-white",
              selected && "text-white",
            )}
            onClick={() => {
              onChange(option.value);
              close();
            }}
          >
            <CheckIcon
              size={14}
              className={cn(
                "shrink-0 text-white",
                selected ? "opacity-100" : "opacity-0",
              )}
            />
            <span
              className={cn("h-2 w-2 rounded-full shrink-0", option.dotClass)}
            />
            {t(option.labelId)}
          </button>
        );
      })}
    </div>
  );
}

// formatChip helper exported for use in the filter def's formatChip().
export function formatStatusChip(
  value: boolean | undefined,
  t = englishTranslations,
): string | null {
  if (value === true) return t("common.online");
  if (value === false) return t("common.offline");
  return null;
}
