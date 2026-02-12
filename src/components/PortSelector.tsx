import Badge from "@components/Badge";
import { Callout } from "@components/Callout";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { orderBy, trim } from "lodash";
import { ChevronsUpDown, SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { PortRange } from "@/interfaces/Policy";

interface MultiSelectProps {
  ports: number[];
  onPortsChange: React.Dispatch<React.SetStateAction<number[]>>;
  portRanges?: PortRange[];
  onPortRangesChange?: React.Dispatch<React.SetStateAction<PortRange[]>>;
  max?: number;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  showAll?: boolean;
}

const isValidPort = (p: number) => p >= 1 && p <= 65535;

const parseRange = (value: string): PortRange | undefined => {
  const parts = value.split("-").map((x) => Number(trim(x)));
  if (parts.length !== 2) return undefined;
  const [start, end] = parts;
  if (!isValidPort(start) || !isValidPort(end) || start >= end)
    return undefined;
  return { start, end };
};

const parsePortInput = (value: string): number | PortRange | undefined => {
  const trimmed = trim(value);
  if (/^\d{1,5}-\d{1,5}$/.test(trimmed)) return parseRange(trimmed);
  const port = Number(trimmed);
  return isValidPort(port) ? port : undefined;
};

export function PortSelector({
  onPortsChange,
  ports,
  portRanges = [],
  onPortRangesChange,
  disabled = false,
  popoverWidth = "auto",
  showAll = false,
}: Readonly<MultiSelectProps>) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const [portsInput, setPortsInput] = useState<string[]>(() => {
    const p = ports.map(String);
    const pr = portRanges.map((r) => {
      if (r.start === r.end) return String(r.start);
      return `${r.start}-${r.end}`;
    });
    return orderBy([...p, ...pr], [(x) => Number(x.split("-")[0])], ["asc"]);
  });

  useEffect(() => {
    const parsed = portsInput.map(parsePortInput).filter(Boolean);
    const newPorts: number[] = [];
    const newRanges: PortRange[] = [];
    parsed.forEach((entry) => {
      if (typeof entry === "number") newPorts.push(entry);
      else if (entry !== undefined) newRanges.push(entry);
    });
    onPortsChange(newPorts);
    onPortRangesChange?.(newRanges);
  }, [portsInput]);

  const toggle = (value: string) => {
    if (disabled) return;
    setPortsInput((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    );
    setSearch("");
  };

  const notFound = useMemo(() => {
    const isSearching = search.length > 0;
    const trimmed = trim(search);
    return (
      trimmed &&
      !portsInput.includes(trimmed) &&
      parsePortInput(trimmed) &&
      isSearching
    );
  }, [search, portsInput]);

  return (
    <>
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
        <PopoverTrigger asChild>
          <button
            className={cn(
              "min-h-[48px] w-full relative items-center",
              "border border-neutral-200 dark:border-nb-gray-700 justify-between py-2 px-3",
              "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer hover:dark:bg-nb-gray-900/50",
            )}
            data-cy={"port-selector"}
            disabled={disabled}
            ref={inputRef}
          >
            <div
              className={
                "flex items-center gap-2 border-nb-gray-700 flex-wrap h-full"
              }
            >
              {portsInput.length === 0 && showAll && (
                <Badge
                  variant={"gray"}
                  className={"uppercase tracking-wider font-medium py-1"}
                >
                  All
                </Badge>
              )}

              {portsInput.map((x) => (
                <Badge
                  key={x}
                  variant={"gray"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(x);
                  }}
                  className={"uppercase tracking-wider font-medium py-1"}
                >
                  {x}
                  <XIcon
                    size={12}
                    className={"cursor-pointer group-hover:text-black"}
                  />
                </Badge>
              ))}
              {ports.length == 0 && <span>Select ports...</span>}
            </div>

            <ChevronsUpDown size={18} className={"shrink-0"} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0 shadow-sm  shadow-nb-gray-950"
          style={{
            width: popoverWidth === "auto" ? width : popoverWidth,
          }}
          align="start"
          side={"top"}
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
                    "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-10",
                  )}
                  data-cy={"port-input"}
                  ref={searchRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder={
                    'Add a port or a range e.g. 80 or 1-1023 and press "Enter" to add...'
                  }
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

              <div
                className={cn(
                  "flex flex-col gap-2",
                  portsInput.length != 0 && "p-2",
                  portsInput.length != 0 && search && "p-2",
                  notFound && "p-2",
                )}
              >
                {!notFound && search && !portsInput.includes(search) && (
                  <div className={"text-sm"}>
                    <DropdownInfoText className={"mb-[18px] pt-[4px]"}>
                      {
                        "Please add a valid port or port range (e.g. 80, 443, 1-1023)"
                      }
                    </DropdownInfoText>
                  </div>
                )}

                {notFound && (
                  <CommandGroup>
                    <div
                      className={cn(
                        "max-h-[180px] overflow-y-auto flex flex-col gap-1",
                      )}
                    >
                      <CommandItem
                        key={search}
                        onSelect={() => {
                          toggle(search);
                          searchRef.current?.focus();
                        }}
                        value={search}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Badge
                          variant={"gray"}
                          className={
                            "uppercase tracking-wider font-medium py-1"
                          }
                        >
                          {search}
                        </Badge>
                        <div
                          className={"text-neutral-500 dark:text-nb-gray-300"}
                        >
                          Add this port or range by pressing{" "}
                          <span className={"font-bold text-netbird"}>
                            {"'Enter'"}
                          </span>
                        </div>
                      </CommandItem>
                    </div>
                  </CommandGroup>
                )}

                <CommandGroup>
                  <div
                    className={cn(
                      "max-h-[180px] overflow-y-auto flex flex-col gap-1",
                    )}
                  >
                    {portsInput.map((option) => {
                      const isSelected = portsInput.includes(option);
                      return (
                        <CommandItem
                          key={option}
                          value={option.toString()}
                          onSelect={() => {
                            toggle(option);
                            searchRef.current?.focus();
                          }}
                          onClick={(e) => e.preventDefault()}
                        >
                          <div className={"flex items-center gap-2"}>
                            <Badge
                              variant={"gray"}
                              className={
                                "uppercase tracking-wider font-medium py-1"
                              }
                            >
                              {option}
                            </Badge>
                          </div>

                          <div
                            className={
                              "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2"
                            }
                          >
                            <Checkbox checked={isSelected} />
                          </div>
                        </CommandItem>
                      );
                    })}
                  </div>
                </CommandGroup>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {portRanges?.length > 0 && (
        <Callout variant={"info"} className={"mt-4"}>
          Port ranges requires NetBird client{" "}
          <span className={"text-white font-normal"}>v0.48</span> or higher.
        </Callout>
      )}
    </>
  );
}
