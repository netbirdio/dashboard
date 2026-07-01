"use client";

import { Checkbox } from "@components/Checkbox";
import { cn } from "@utils/helpers";
import * as React from "react";

// CheckboxListPicker — multi-select with checkboxes. Designed for small
// finite option sets (no search). For long, dynamic lists with search,
// use GroupsPicker or UsersPicker as the model.
export type CheckboxOption<V> = {
  value: V;
  label: string;
};

type Props<V extends string | number> = {
  value: V[] | undefined;
  onChange: (next: V[] | undefined) => void;
  close: () => void;
  options: CheckboxOption<V>[];
};

export function CheckboxListPicker<V extends string | number>({
  value,
  onChange,
  options,
}: Props<V>) {
  const selected = value ?? [];

  const toggle = (v: V) => {
    const isSelected = selected.includes(v);
    const next = isSelected
      ? selected.filter((s) => s !== v)
      : [...selected, v];
    onChange(next.length ? next : undefined);
  };

  return (
    <div className={"flex flex-col gap-0.5"}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <div
            key={String(option.value)}
            role={"button"}
            tabIndex={0}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer",
              "text-nb-gray-300 hover:bg-nb-gray-900 hover:text-white",
              isSelected && "text-white",
            )}
            onClick={() => toggle(option.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(option.value);
              }
            }}
          >
            <Checkbox checked={isSelected} tabIndex={-1} />
            {option.label}
          </div>
        );
      })}
    </div>
  );
}

// Helper to produce a chip body for multi-select filters with bounded
// option sets. Returns:
//   null  when no selections
//   the option's label when exactly one is selected
//   `N {plural}` when multiple are selected (e.g. "3 OSes")
export function formatCheckboxChip<V>(
  value: V[] | undefined,
  options: CheckboxOption<V>[],
  plural: string,
): string | null {
  if (!value || value.length === 0) return null;
  if (value.length === 1) {
    return options.find((o) => o.value === value[0])?.label ?? String(value[0]);
  }
  return `${value.length} ${plural}`;
}
