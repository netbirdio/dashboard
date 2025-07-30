import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { SmallBadge } from "@components/ui/SmallBadge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn, generateColorFromString } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { sortBy, trim, uniqBy } from "lodash";
import { ChevronsUpDown, Cog, SearchIcon, UserCircle2 } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useElementSize } from "@/hooks/useElementSize";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

interface Props {
  value?: string;
  onChange: (item: string | undefined) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  options: UserSelectOption[];
}

export type UserSelectOption = {
  id: string;
  name: string;
  email: string;
  external?: boolean;
};

export function UsersDropdownSelector({
  onChange,
  value,
  disabled = false,
  popoverWidth = 250,
  options,
}: Props) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 500);

  const toggle = (item: string | undefined) => {
    const isSelected = value == item;
    if (isSelected) {
      onChange && onChange(undefined);
    } else {
      onChange && onChange(item);
      setSearchInput("");
    }
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const sortedOptions = useMemo(() => {
    return sortBy(
      uniqBy(options, (o) => o.email),
      ["external", "name"],
    );
  }, [options]);

  const selectedUser = useMemo(() => {
    return options.find((user) => user.email == value);
  }, [value, options]);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => {
            setSearchInput("");
          }, 100);
        }
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild={true}>
        <Button variant={"secondary"} disabled={disabled} ref={inputRef}>
          <div className={"w-full flex justify-between items-center gap-2"}>
            {!selectedUser ? (
              <React.Fragment>
                <UserCircle2 size={16} />
                All Users
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div
                  className={
                    "w-5 h-5 rounded-full flex items-center justify-center text-white uppercase text-[9px] font-medium bg-nb-gray-900"
                  }
                  style={{
                    color:
                      selectedUser?.email === "NetBird"
                        ? "#808080"
                        : generateColorFromString(
                            selectedUser?.name ||
                              selectedUser?.id ||
                              "System User",
                          ),
                  }}
                >
                  {selectedUser?.email === "NetBird" ? (
                    <Cog size={12} />
                  ) : (
                    selectedUser?.name?.charAt(0) || selectedUser?.id?.charAt(0)
                  )}
                </div>
                <div className={"flex items-center gap-2"}>
                  <TextWithTooltip
                    text={
                      selectedUser?.email === "NetBird"
                        ? "System"
                        : selectedUser?.name
                    }
                    maxChars={20}
                    className={"leading-none"}
                  />
                </div>
              </React.Fragment>
            )}

            <div className={"pl-2"}>
              <ChevronsUpDown size={18} className={"shrink-0"} />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm  shadow-nb-gray-950 min-w-[300px]"
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
                  "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-10",
                )}
                ref={searchRef}
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder={"Search user..."}
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
              <CommandGroup>
                <div className={"grid grid-cols-1 gap-1"}>
                  <CommandItem
                    value={undefined}
                    className={"py-1 px-2"}
                    onSelect={() => {
                      toggle(undefined);
                    }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <div className={"flex items-center gap-2"}>
                      <div
                        className={
                          "w-7 h-7 rounded-full flex items-center justify-center uppercase text-[9px] font-medium bg-sky-400 text-white"
                        }
                      >
                        <UserCircle2 size={16} />
                      </div>

                      <div className={"flex flex-col text-xs"}>
                        <span className={"text-nb-gray-200"}>All Users</span>
                        <span className={"text-nb-gray-400 font-light"}>
                          Include all users
                        </span>
                      </div>
                    </div>
                  </CommandItem>

                  {sortedOptions.map((user) => {
                    const isSystemUser = user.email === "NetBird";
                    const searchValue = isSystemUser
                      ? "NetBird System"
                      : user.name + " " + user.id + " " + user.email;

                    return (
                      <CommandItem
                        key={user.id}
                        value={searchValue}
                        className={"py-1 px-2"}
                        onSelect={() => {
                          toggle(user.email);
                        }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className={"flex items-center gap-2 w-full"}>
                          <SmallUserAvatar
                            name={user?.name}
                            email={user?.email}
                            id={user?.id}
                          />

                          <div className={"flex flex-col text-xs w-full"}>
                            <span
                              className={
                                "text-nb-gray-200 flex items-center gap-1.5 w-full"
                              }
                            >
                              <TextWithTooltip
                                text={
                                  isSystemUser
                                    ? "System"
                                    : user?.name || user?.id
                                }
                                maxChars={20}
                              />
                            </span>
                            <span
                              className={
                                "text-nb-gray-400 font-light flex items-center gap-1"
                              }
                            >
                              <TextWithTooltip
                                text={user?.email || "NetBird"}
                                maxChars={20}
                              />
                            </span>
                          </div>
                          {user.external && (
                            <span
                              className={"flex items-center ml-auto relative"}
                            >
                              <SmallBadge
                                text={"External"}
                                variant={"sky"}
                                className={
                                  "text-[8.5px] py-[0.15rem] px-[.32rem] leading-none rounded-full -top-0"
                                }
                              />
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
      </PopoverContent>
    </Popover>
  );
}
