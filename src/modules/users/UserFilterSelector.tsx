import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { orderBy, trim } from "lodash";
import { ChevronsUpDown, SearchIcon, UserIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { User } from "@/interfaces/User";

interface Props {
  values: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  users: User[] | undefined;
}

export function UserFilterSelector({
  onChange,
  values,
  disabled = false,
  popoverWidth = 360,
  users,
}: Props) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    const isSelected = values.includes(id);
    if (isSelected) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
      setSearch("");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => setSearch(""), 100);
        }
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild={true}>
        <Button variant={"secondary"} disabled={disabled} ref={inputRef}>
          <UserIcon size={16} className={"shrink-0"} />
          <div className={"w-full flex justify-between"}>
            {values.length > 0 ? (
              <div>{values.length} User(s)</div>
            ) : (
              "All Users"
            )}
            <div className={"pl-2"}>
              <ChevronsUpDown size={18} className={"shrink-0"} />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{ width: popoverWidth === "auto" ? width : popoverWidth }}
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
            return formatValue.includes(formatSearch) ? 1 : 0;
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
                ref={searchRef}
                value={search}
                onValueChange={setSearch}
                placeholder={"Search user..."}
              />
              <div
                className={
                  "absolute left-0 top-0 h-full flex items-center pl-4"
                }
              >
                <SearchIcon size={14} />
              </div>
            </div>

            <ScrollArea
              className={
                "max-h-[380px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"
              }
            >
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1"}>
                  {orderBy(users, ["email"])?.map((user) => {
                    const id = user?.id;
                    if (!id) return null;
                    const display = user.email || id;
                    const searchValue = `${user.email ?? ""} ${user.name ?? ""}`;
                    const isSelected = values.includes(id);

                    return (
                      <CommandItem
                        key={id}
                        value={searchValue}
                        className={"p-1"}
                        onSelect={() => {
                          toggle(id);
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
                              "flex items-center gap-2 whitespace-nowrap text-sm font-normal min-w-0"
                            }
                          >
                            <UserIcon size={13} className={"shrink-0"} />
                            <TextWithTooltip text={display} maxChars={28} />
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
