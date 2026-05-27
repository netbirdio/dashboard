"use client";

import { cn } from "@utils/helpers";
import { CheckIcon } from "lucide-react";
import * as React from "react";

// RadioPicker — single-value radio list. Generic over the value type so
// it works for any boolean / string / numeric column filter that maps
// to a small finite set of options.
export type RadioOption<V> = {
  value: V;
  label: string;
  dotClass?: string;
};

type Props<V> = {
  value: V | undefined;
  onChange: (next: V | undefined) => void;
  close: () => void;
  options: RadioOption<V | undefined>[];
};

export function RadioPicker<V>({
  value,
  onChange,
  close,
  options,
}: Props<V>) {
  return (
    <div className={"flex flex-col gap-0.5"}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.label}
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
            {option.dotClass && (
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  option.dotClass,
                )}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Build the chip text given the selected value and options.
export function formatRadioChip<V>(
  value: V | undefined,
  options: RadioOption<V | undefined>[],
): string | null {
  // Treat undefined-valued option (i.e. "All") as no chip.
  if (value === undefined) return null;
  const opt = options.find((o) => o.value === value);
  return opt?.label ?? null;
}
