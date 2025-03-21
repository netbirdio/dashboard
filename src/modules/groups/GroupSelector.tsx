import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { orderBy, trim } from "lodash";
import {
  ChevronsUpDown,
  FolderGit2,
  MonitorSmartphoneIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { Group } from "@/interfaces/Group";

interface MultiSelectProps {
  values: string[];
  exclusiveValue?: string;
  onChange: (anyOfValues: string[], exclusiveValue?: string) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  groups: Group[] | undefined;
  unassignedCount?: number;
  defaultGroupName?: string;
}
export function GroupSelector({
  onChange,
  values,
  exclusiveValue,
  disabled = false,
  popoverWidth = 400,
  groups,
  unassignedCount,
  defaultGroupName = "All", //defined as a property, no clue if this value may change in the future
}: MultiSelectProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const toggleAnyOf = (code: string) => {
    const isSelected = values.find((c) => c == code) != undefined;
    if (isSelected) {
      onChange && onChange(values.filter((c) => c != code), undefined);
    } else {
      onChange && onChange([...values, code], undefined);
      setSearch("");
    }
  };

  const toggleExclusive = (code: string) => {
    const isSelected = exclusiveValue == code;
    if (isSelected) {
      onChange && onChange([], undefined);
      setSearch("");
    } else {
      onChange && onChange([], code);
      setSearch("");
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => {
            setSearch("");
          }, 100);
        }
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild={true}>
        <Button variant={"secondary"} disabled={disabled} ref={inputRef} className="w-[200px] justify-between">
          <FolderGit2 size={16} className={"shrink-0"} />
          <div className={"w-full flex justify-between"}>
            {
              exclusiveValue != undefined
                ? ("Unassigned peers")
                : values.length > 0
                  ? (`${values.length} Group(s)`)
                  : ("All Groups")
            }
            <div className={"pl-2"}>
              <ChevronsUpDown size={18} className={"shrink-0"} />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm  shadow-nb-gray-950"
        style={{
          width: popoverWidth === "auto" ? width : popoverWidth,
        }}
        align="start"
        side={"bottom"}
        sideOffset={10}
      >
        <Command
          className={"w-full flex"}
          loop
          filter={(value, search) => {
            const formatValue = trim(value.toLowerCase());
            const formatSearch = trim(search.toLowerCase());
            if (formatValue.includes(formatSearch)) return 1;
            return 0;
          }}
        >
          <CommandList className={"w-full"}>
            <div className={"relative"}>
              <CommandInput
                className={cn(
                  "min-h-[42px] w-full relative",
                  "border-b-0 border-t-0 border-r-0 border-l-0 border-neutral-200 dark:border-nb-gray-700 items-center",
                  "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
                  "dark:placeholder:text-neutral-500 font-light placeholder:text-neutral-500 pl-10",
                )}
                ref={searchRef}
                value={search}
                onValueChange={setSearch}
                placeholder={"Search group..."}
              />
              <div
                className={
                  "absolute left-0 top-0 h-full flex items-center pl-4"
                }
              >
                <div className={"flex items-center"}>
                  <SearchIcon size={14} />
                </div>
              </div>
              <div
                className={
                  "absolute right-0 top-0 h-full flex items-center pr-4"
                }
              >
                <div
                  className={
                    "flex items-center bg-nb-gray-800 py-1 px-1.5 rounded-[4px] border border-nb-gray-500"
                  }
                >
                  <IconArrowBack size={10} />
                </div>
              </div>
            </div>
            <ScrollArea
              className={
                "max-h-[380px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"
              }
            >
              <CommandGroup>
                <div className={""}>
                  <div className={"grid grid-cols-1 gap-1"}>
                    <CommandItem
                      className={"p-1"}
                      onSelect={() => {
                        toggleExclusive(defaultGroupName);
                        searchRef.current?.focus();
                      }}
                      onClick={(e) => e.preventDefault()}
                      >
                      <div
                        className={
                          "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-3 py-1 px-1 w-full"
                        }
                      >
                        <Checkbox checked={exclusiveValue == defaultGroupName}/>
                        <div
                          className={
                            "flex justify-between items-center w-full"
                          }
                        >
                          <div
                            className={
                              "flex items-center gap-2 whitespace-nowrap text-sm"
                            }
                          >
                            <FolderGit2 size={13} className={"shrink-0"} />
                            <TextWithTooltip text={"Unassigned peers"} />
                          </div>
                          <div
                                className={
                                  "flex items-center gap-2 text-xs text-nb-gray-200/60"
                                }
                              >
                                <MonitorSmartphoneIcon size={13} />
                                {unassignedCount} Peer(s)
                              </div>
                        </div>
                      </div>
                    </CommandItem>
                    <hr />
                    {orderBy(groups, "name")
                        ?.filter((group) => group.name != defaultGroupName) // Ignore default group
                        ?.map((item) => {
                      const value = item?.name || "";
                      if (value === "") return null;
                      const isSelected =
                        values.find((c) => c == value) != undefined;

                      return (
                        <CommandItem
                          key={value}
                          value={value}
                          className={"p-1"}
                          onSelect={() => {
                            toggleAnyOf(value);
                            searchRef.current?.focus();
                          }}
                          onClick={(e) => e.preventDefault()}
                        >
                          <div
                            className={
                              "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-3 py-1 px-1 w-full"
                            }
                          >
                            <Checkbox checked={isSelected} />
                            <div
                              className={
                                "flex justify-between items-center w-full"
                              }
                            >
                              <div
                                className={
                                  "flex items-center gap-2 whitespace-nowrap text-sm font-normal"
                                }
                              >
                                <GroupBadgeIcon
                                  id={item?.id}
                                  issued={item?.issued}
                                />
                                <TextWithTooltip text={value} maxChars={15} />
                              </div>
                              <div
                                className={
                                  "flex items-center gap-2 text-xs text-nb-gray-200/60"
                                }
                              >
                                <MonitorSmartphoneIcon size={13} />
                                {item.peers_count} Peer(s)
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </div>
                </div>
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
