import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { trim, uniqBy } from "lodash";
import { ChevronsUpDown, Layers, SearchIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { ActivityEvent } from "@/interfaces/ActivityEvent";
import ActivityTypeIcon from "@/modules/activity/ActivityTypeIcon";

interface MultiSelectProps {
  values: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  events: ActivityEvent[];
}
export function ActivityEventCodeSelector({
  onChange,
  values,
  disabled = false,
  popoverWidth = 400,
  events,
}: MultiSelectProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const toggle = (code: string) => {
    const isSelected = values.find((c) => c == code) != undefined;
    if (isSelected) {
      onChange && onChange(values.filter((c) => c != code));
    } else {
      onChange && onChange([...values, code]);
      setSearch("");
    }
  };

  const [open, setOpen] = useState(false);

  const groupedEventNames = useMemo(() => {
    const uniqueCodes = uniqBy(events, (event) => event.activity_code);
    const items = uniqueCodes.map((event) => {
      return {
        activity_code: event.activity_code,
        activity: event.activity,
        group: event.activity_code.split(".")[0],
      };
    });
    return items.reduce((acc, item) => {
      const { group } = item;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as any);
  }, [events]);

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
        <Button variant={"secondary"} disabled={disabled} ref={inputRef}>
          <Layers size={16} className={"shrink-0"} />
          <div className={"w-full flex justify-between"}>
            {values.length > 0 ? (
              <div>{values.length} Event(s)</div>
            ) : (
              "All Event Types"
            )}
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
                  "dark:placeholder:text-nb-gray-400 font-light placeholder:text-nb-gray-500 pl-10",
                )}
                ref={searchRef}
                value={search}
                onValueChange={setSearch}
                placeholder={"Search event..."}
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
            </div>

            <ScrollArea
              className={
                "max-h-[380px] overflow-y-hidden flex flex-col gap-1 pl-2 py-2 pr-3"
              }
            >
              {Object.keys(groupedEventNames).map((group) => {
                const groupItems = groupedEventNames[group];
                return (
                  <CommandGroup key={group}>
                    <div className={"mb-3"}>
                      <p
                        className={
                          "!text-nb-gray-400 text-xs uppercase font-medium tracking-wider pb-1 pl-2 mb-.5"
                        }
                      >
                        {group}
                      </p>
                      <div className={"grid grid-cols-1 pl-1 gap-1"}>
                        {groupItems.map((event: any) => {
                          const option = event.activity;
                          const code = event.activity_code;
                          const isSelected =
                            values.find((c) => c == code) != undefined;

                          return (
                            <CommandItem
                              key={code}
                              value={code}
                              className={"p-1"}
                              onSelect={() => {
                                toggle(code);
                                searchRef.current?.focus();
                              }}
                              onClick={(e) => e.preventDefault()}
                            >
                              <div
                                className={
                                  "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2"
                                }
                              >
                                <Checkbox checked={isSelected} />
                                <div
                                  className={
                                    "flex items-center gap-2 whitespace-nowrap text-xs"
                                  }
                                >
                                  <ActivityTypeIcon code={code} size={14} />
                                  {option}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </div>
                    </div>
                  </CommandGroup>
                );
              })}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
