"use client";

import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { ScrollArea } from "@components/ScrollArea";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { orderBy, trim } from "lodash";
import { MonitorSmartphoneIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { useRef } from "react";
import { Group } from "@/interfaces/Group";

// GroupsPicker — multi-select search list of group names. The value
// stored on the column filter is an array of group *names* (matching
// PeersTable's group_names column which uses arrIncludesSome).
type Props = {
  value: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
  close: () => void; // unused (multi-select stays open while picking)
  groups: Group[] | undefined;
};

export function GroupsPicker({ value, onChange, groups }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = value ?? [];

  const toggle = (name: string) => {
    const isSelected = selected.includes(name);
    const next = isSelected
      ? selected.filter((n) => n !== name)
      : [...selected, name];
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
            placeholder={"Search group..."}
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
            "max-h-[300px] overflow-y-auto flex flex-col gap-1 p-1.5"
          }
        >
          <CommandGroup>
            <div className={"grid grid-cols-1 gap-0.5"}>
              {orderBy(groups, ["peers_count"], ["desc"])?.map((group) => {
                const name = group?.name;
                if (!name) return null;
                const isSelected = selected.includes(name);

                return (
                  <CommandItem
                    key={group.id || name}
                    value={name}
                    className={"p-1"}
                    onSelect={() => {
                      toggle(name);
                      searchRef.current?.focus();
                    }}
                  >
                    <div
                      className={
                        "text-nb-gray-300 font-medium flex items-center gap-2.5 py-1 px-1 w-full"
                      }
                    >
                      <Checkbox checked={isSelected} />
                      <div
                        className={
                          "flex items-center gap-1.5 whitespace-nowrap text-sm font-normal min-w-0"
                        }
                      >
                        <GroupBadgeIcon id={group?.id} issued={group?.issued} />
                        <TextWithTooltip text={name} maxChars={22} />
                      </div>
                      {group?.peers_count !== undefined && (
                        <span
                          className={
                            "ml-auto text-xs text-nb-gray-400 flex items-center gap-1"
                          }
                        >
                          <MonitorSmartphoneIcon size={11} />
                          {group.peers_count}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </div>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </Command>
  );
}

export function formatGroupsChip(value: string[] | undefined): string | null {
  if (!value || value.length === 0) return null;
  if (value.length === 1) return value[0];
  return `${value.length} groups`;
}
