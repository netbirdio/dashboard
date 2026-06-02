"use client";

import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { trim, uniqBy } from "lodash";
import { SearchIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useRef } from "react";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import ActivityTypeIcon from "@/modules/activity/ActivityTypeIcon";

// ActivityTypePicker — multi-select grouped list of activity codes used by
// the Audit Events table. Mirrors the original ActivityEventCodeSelector
// structure (category headers + search + checkbox per code), but renders
// inline so it can live inside the consolidated Filters popover.
type Props = {
  value: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
  close: () => void;
  events: ActivityEvent[];
};

type GroupedItem = {
  activity_code: string;
  activity: string;
  group: string;
};

export function ActivityTypePicker({
  value,
  onChange,
  events,
}: Readonly<Props>) {
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = value ?? [];

  const grouped = useMemo<Record<string, GroupedItem[]>>(() => {
    const unique = uniqBy(events, (event) => event.activity_code);
    const items: GroupedItem[] = unique.map((event) => ({
      activity_code: event.activity_code,
      activity: event.activity,
      group: event.activity_code.startsWith("service.user")
        ? "Service User"
        : event.activity_code.split(".")[0],
    }));
    return items.reduce<Record<string, GroupedItem[]>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, [events]);

  const toggle = (code: string) => {
    const isSelected = selected.includes(code);
    const next = isSelected
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    onChange(next.length ? next : undefined);
  };

  return (
    <Command
      className={"w-full flex"}
      loop
      filter={(value, search) => {
        const formatValue = trim(value.toLowerCase());
        const formatSearch = trim(search.toLowerCase());
        return formatValue.includes(formatSearch) ? 1 : 0;
      }}
    >
      <CommandList className={"w-full"}>
        <div className={"relative"}>
          <CommandInput
            className={cn(
              "min-h-[38px] w-full relative bg-transparent text-sm",
              "border-b border-nb-gray-900 outline-none",
              "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-9",
            )}
            ref={searchRef}
            placeholder={"Search event..."}
          />
          <div
            className={
              "absolute left-0 top-0 h-full flex items-center pl-3 text-nb-gray-400"
            }
          >
            <SearchIcon size={13} />
          </div>
        </div>

        <ScrollArea
          className={
            "max-h-[320px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-2"
          }
        >
          {Object.keys(grouped).map((group) => (
            <CommandGroup key={group}>
              <div className={"mb-2"}>
                <p
                  className={
                    "!text-nb-gray-400 text-xs uppercase font-medium tracking-wider pb-1 pl-2"
                  }
                >
                  {group}
                </p>
                <div className={"grid grid-cols-1 pl-1 gap-0.5"}>
                  {grouped[group].map((event) => {
                    const code = event.activity_code;
                    const isSelected = selected.includes(code);
                    return (
                      <CommandItem
                        key={code}
                        value={`${code} ${event.activity ?? ""}`}
                        className={"p-1"}
                        onSelect={() => {
                          toggle(code);
                          searchRef.current?.focus();
                        }}
                      >
                        <div
                          className={
                            "text-nb-gray-300 font-medium flex items-center gap-2 py-0.5 px-1 w-full"
                          }
                        >
                          <Checkbox checked={isSelected} />
                          <div
                            className={
                              "flex items-center gap-2 whitespace-nowrap text-xs font-normal"
                            }
                          >
                            <ActivityTypeIcon code={code} size={14} />
                            {event.activity}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </div>
            </CommandGroup>
          ))}
        </ScrollArea>
      </CommandList>
    </Command>
  );
}

export function formatActivityTypeChip(
  value: string[] | undefined,
): string | null {
  if (!value || value.length === 0) return null;
  if (value.length === 1) return value[0];
  return `${value.length} types`;
}
