import Badge from "@components/Badge";
import { Callout } from "@components/Callout";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { trim } from "lodash";
import {
  ChevronsUpDown,
  CircleUserIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { PostureCheck } from "@/interfaces/PostureCheck";

interface MultiSelectProps {
  values?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
}

export function SSHUsernameSelector({
  values,
  onChange,
  disabled = false,
  popoverWidth = "auto",
}: Readonly<MultiSelectProps>) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const toggle = (value: string) => {
    if (disabled) return;

    const previous = values || [];
    if (previous.includes(value)) {
      onChange(previous.filter((item) => item !== value));
    } else {
      onChange([...previous, value]);
    }

    setSearch("");
  };

  const notFound = useMemo(() => {
    const isSearching = search.length > 0;
    const trimmed = trim(search);
    return trimmed && !values?.includes(trimmed) && isSearching;
  }, [search, values]);

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
              "min-h-[42px] w-full relative items-center",
              "border border-neutral-200 dark:border-nb-gray-700 justify-between py-1.5 px-2.5",
              "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer hover:dark:bg-nb-gray-900/50",
            )}
            data-cy={"ssh-username-selector"}
            disabled={disabled}
            ref={inputRef}
          >
            <div
              className={
                "flex items-center gap-2 border-nb-gray-700 flex-wrap h-full"
              }
            >
              {values?.length === 0 && (
                <Badge variant={"gray"} className={"font-normal py-1"}>
                  <CircleUserIcon size={12} className={"shrink-0"} />
                  All Local Users
                </Badge>
              )}

              {values?.map((user) => (
                <Badge
                  key={user}
                  variant={"gray"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(user);
                  }}
                  className={"font-normal py-1"}
                >
                  {user}
                  <XIcon
                    size={12}
                    className={"cursor-pointer group-hover:text-black"}
                  />
                </Badge>
              ))}
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
                  data-cy={"ssh-username-input"}
                  ref={searchRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder={"E.g., root, ec2-user, ubuntu"}
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
                  values?.length != 0 && "p-2",
                  values?.length != 0 && search && "p-2",
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
                          toggle(search);
                          searchRef.current?.focus();
                        }}
                        value={search}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Badge variant={"gray"} className={"font-normal py-1"}>
                          {search}
                        </Badge>
                        <div
                          className={"text-neutral-500 dark:text-nb-gray-300"}
                        >
                          Add username by pressing{" "}
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
                    {values?.map((user) => {
                      const isSelected = values?.includes(user);
                      return (
                        <CommandItem
                          key={user}
                          value={user.toString()}
                          onSelect={() => {
                            toggle(user);
                            searchRef.current?.focus();
                          }}
                          onClick={(e) => e.preventDefault()}
                        >
                          <div className={"flex items-center gap-2"}>
                            <Badge
                              variant={"gray"}
                              className={"font-normal py-1"}
                            >
                              {user}
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
    </>
  );
}
