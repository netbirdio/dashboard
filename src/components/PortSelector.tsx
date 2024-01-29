import Badge from "@components/Badge";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { trim } from "lodash";
import { ChevronsUpDown, SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";

interface MultiSelectProps {
  values: number[];
  onChange: React.Dispatch<React.SetStateAction<number[]>>;
  max?: number;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  showAll?: boolean;
}
export function PortSelector({
  onChange,
  values,
  max,
  disabled = false,
  popoverWidth = "auto",
  showAll = false,
}: MultiSelectProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const toggle = (x: number) => {
    if (isNaN(Number(x))) return;
    const port = Number(x);
    if (port < 1 || port > 65535) return;

    const isSelected = values.includes(port);
    if (isSelected) {
      onChange((previous) => previous.filter((y) => y !== port));
    } else {
      onChange((previous) => [...previous, port]);
      setSearch("");
    }
  };

  const notFound = useMemo(() => {
    const isSearching = search.length > 0;
    const found =
      values.filter((item) => item == Number(trim(search))).length == 0;
    return isSearching && found;
  }, [search, values]);

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
      <PopoverTrigger asChild>
        <button
          className={cn(
            "min-h-[48px] w-full relative items-center",
            "border border-neutral-200 dark:border-nb-gray-700 justify-between py-2 px-3",
            "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer hover:dark:bg-nb-gray-900/50",
          )}
          disabled={disabled}
          ref={inputRef}
        >
          <div
            className={
              "flex items-center gap-2 border-nb-gray-700 flex-wrap h-full"
            }
          >
            {values.length === 0 && showAll && (
              <Badge
                variant={"gray"}
                className={"uppercase tracking-wider font-medium py-1"}
              >
                All
              </Badge>
            )}

            {values.map((x) => (
              <Badge
                key={x}
                variant={"gray"}
                onClick={() => toggle(x)}
                className={"uppercase tracking-wider font-medium py-1"}
              >
                {x}
                <XIcon
                  size={12}
                  className={"cursor-pointer group-hover:text-black"}
                />
              </Badge>
            ))}
            {values.length == 0 && <span>Select ports...</span>}
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
                  "dark:placeholder:text-neutral-500 font-light placeholder:text-neutral-500 pl-10",
                )}
                typeof={"number"}
                ref={searchRef}
                value={search}
                onValueChange={setSearch}
                placeholder={'Add new ports by pressing "Enter"...'}
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
                values.length != 0 && "p-2",
                values.length != 0 && search && "p-2",
                values.length == 0 && search && "p-2",
              )}
            >
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
                        toggle(Number(search));
                        searchRef.current?.focus();
                      }}
                      value={search}
                      onClick={(e) => e.preventDefault()}
                    >
                      <Badge
                        variant={"gray"}
                        className={"uppercase tracking-wider font-medium py-1"}
                      >
                        {search}
                      </Badge>
                      <div className={"text-neutral-500 dark:text-nb-gray-300"}>
                        Add this port by pressing{" "}
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
                  {values.map((option) => {
                    const isSelected = values.includes(option);
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
  );
}
