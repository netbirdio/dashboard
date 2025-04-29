import Button from "@components/Button";
import { CommandItem } from "@components/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { IconArrowBack } from "@tabler/icons-react";
import { cn, generateColorFromString } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { trim, uniqBy } from "lodash";
import { ChevronsUpDown, Cog, SearchIcon, UserCircle2 } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { ActivityEvent } from "@/interfaces/ActivityEvent";

interface MultiSelectProps {
  value?: string;
  onChange: (item: string | undefined) => void;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  events: ActivityEvent[];
}
export function ActivityUserSelector({
  onChange,
  value,
  disabled = false,
  popoverWidth = 250,
  events,
}: MultiSelectProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const toggle = (item: string | undefined) => {
    const isSelected = value == item;
    if (isSelected) {
      onChange && onChange(undefined);
    } else {
      onChange && onChange(item);
      setSearch("");
    }
    setOpen(false);
  };

  const [open, setOpen] = useState(false);

  const users = useMemo(() => {
    const uniqueUsers = uniqBy(events, (event) => event.initiator_email);
    return uniqueUsers.map((event) => {
      return {
        name: event.initiator_name,
        id: event.initiator_id,
        email: event.initiator_email || "NetBird",
      };
    });
  }, [events]);

  const selectedUser = useMemo(() => {
    return users.find((user) => user.email == value);
  }, [value, users]);

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
                    color: selectedUser?.name
                      ? generateColorFromString(
                          selectedUser?.name ||
                            selectedUser?.id ||
                            "System User",
                        )
                      : "#808080",
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
                    text={selectedUser?.name || "System"}
                    maxChars={20}
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
                  "min-h-[42px] w-full relative border-default items-center",
                  "border-b-0 border-t-0 border-r-0 border-l-0",
                  "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
                  "dark:placeholder:text-neutral-500 font-light placeholder:text-neutral-500 pl-10",
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
                      searchRef.current?.focus();
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

                  {users.map((user) => {
                    const searchValue =
                      user.email === "NetBird"
                        ? "NetBird System"
                        : user.name + " " + user.id + " " + user.email;
                    return (
                      <CommandItem
                        key={user.id}
                        value={searchValue}
                        className={"py-1 px-2"}
                        onSelect={() => {
                          toggle(user.email);
                          searchRef.current?.focus();
                        }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className={"flex items-center gap-2"}>
                          <div
                            className={
                              "w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white uppercase text-[12px] font-medium bg-nb-gray-800"
                            }
                            style={{
                              color: user?.name
                                ? generateColorFromString(
                                    user?.name || user?.id || "System User",
                                  )
                                : "#808080",
                            }}
                          >
                            {user?.email === "NetBird" ? (
                              <Cog size={14} />
                            ) : (
                              user?.name?.charAt(0) || user?.id?.charAt(0)
                            )}
                          </div>

                          <div className={"flex flex-col text-xs"}>
                            <span className={" text-nb-gray-200"}>
                              <TextWithTooltip
                                text={
                                  user?.email === "NetBird"
                                    ? "System"
                                    : user?.name || user?.id
                                }
                                maxChars={20}
                              />
                            </span>
                            <span className={"text-nb-gray-400 font-light"}>
                              <TextWithTooltip
                                text={user?.email || "NetBird"}
                                maxChars={20}
                              />
                            </span>
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
