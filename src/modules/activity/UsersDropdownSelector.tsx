import Button from "@components/Button";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { SmallBadge } from "@components/ui/SmallBadge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import { generateColorFromString } from "@utils/helpers";
import { sortBy, uniqBy } from "lodash";
import { ChevronsUpDown, Cog, UserCircle2 } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
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

const searchPredicate = (item: UserSelectOption, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (
    item.email === "NetBird" &&
    "NetBird System".toLowerCase().includes(lowerCaseQuery)
  )
    return true;
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  if (item.email?.toLowerCase().includes(lowerCaseQuery)) return true;
  return item.id.toLowerCase().startsWith(lowerCaseQuery);
};

export function UsersDropdownSelector({
  onChange,
  value,
  disabled = false,
  popoverWidth = 250,
  options,
}: Readonly<Props>) {
  const [filteredItems, search, setSearch] = useSearch(
    options.concat({
      id: "all-users",
      name: "All Users",
      email: "Include all users",
    }),
    searchPredicate,
    { filter: true, debounce: 150 },
  );
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

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

  const sortedOptions = useMemo(() => {
    const sorted = sortBy(
      uniqBy(filteredItems, (o) => o.email),
      ["external", "name"],
    );
    const allUsersIndex = sorted.findIndex((o) => o.id === "all-users");
    if (allUsersIndex > -1) {
      const allUsers = sorted.splice(allUsersIndex, 1)[0];
      sorted.unshift(allUsers);
    }
    return sorted;
  }, [filteredItems]);

  const selectedUser = useMemo(() => {
    return options.find((user) => user.email == value);
  }, [value, options]);

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
        <div className={"w-full"}>
          <DropdownInput
            value={search}
            onChange={setSearch}
            placeholder={"Search user..."}
            hideEnterIcon={true}
          />

          {options.length == 0 && !search && (
            <div className={"max-w-xs mx-auto"}>
              <DropdownInfoText>
                {"No users available to select."}
              </DropdownInfoText>
            </div>
          )}

          {filteredItems.length == 0 && search != "" && (
            <div className={"px-10"}>
              <DropdownInfoText>
                There are no users matching your search.
              </DropdownInfoText>
            </div>
          )}

          {sortedOptions.length > 0 && (
            <VirtualScrollAreaList
              items={sortedOptions}
              estimatedItemHeight={52}
              maxHeight={380}
              scrollAreaClassName={"pt-0"}
              onSelect={(item) => {
                if (item.id === "all-users") {
                  toggle(undefined);
                  return;
                }
                toggle(item.email);
              }}
              renderItem={(user) => {
                const isSystemUser = user.email === "NetBird";

                return (
                  <div className={"flex items-center gap-2 w-full"}>
                    {user.id === "all-users" ? (
                      <div
                        className={
                          "w-7 h-7 shrink-0 rounded-full flex items-center justify-center uppercase text-[9px] font-medium bg-sky-400 text-white"
                        }
                      >
                        <UserCircle2 size={16} />
                      </div>
                    ) : (
                      <SmallUserAvatar
                        name={user?.name}
                        email={user?.email}
                        id={user?.id}
                      />
                    )}

                    <div className={"flex flex-col text-xs w-full"}>
                      <span
                        className={
                          "text-nb-gray-200 flex items-center gap-1.5 w-full"
                        }
                      >
                        <TextWithTooltip
                          text={
                            isSystemUser ? "System" : user?.name || user?.id
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
                      <span className={"flex items-center ml-auto relative"}>
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
                );
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
