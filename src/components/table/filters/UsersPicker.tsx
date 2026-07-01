"use client";

import { DropdownInput } from "@components/DropdownInput";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { useSearch } from "@hooks/useSearch";
import { sortBy, uniqBy } from "lodash";
import { UserCircle2 } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

// UsersPicker — single-select search list mirroring the Activity ›
// Audit Logs user filter. The value stored on the column filter is the
// user's email (matches PeersTable's user_email accessor).
export type UserOption = {
  id: string;
  name: string;
  email: string;
  external?: boolean;
};

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  close: () => void;
  options: UserOption[];
};

const ALL_USERS_ID = "all-users";

const searchPredicate = (item: UserOption, query: string) => {
  const q = query.toLowerCase();
  if (item.email === "NetBird" && "NetBird System".toLowerCase().includes(q))
    return true;
  if (item.name?.toLowerCase().includes(q)) return true;
  if (item.email?.toLowerCase().includes(q)) return true;
  return item.id.toLowerCase().startsWith(q);
};

export function UsersPicker({ value, onChange, close, options }: Props) {
  const [filteredItems, search, setSearch] = useSearch(
    options.concat({
      id: ALL_USERS_ID,
      name: "All Users",
      email: "Include all users",
    }),
    searchPredicate,
    { filter: true, debounce: 150 },
  );

  const sortedOptions = useMemo(() => {
    const sorted = sortBy(
      uniqBy(filteredItems, (o) => o.email),
      ["external", "name"],
    );
    const allUsersIndex = sorted.findIndex((o) => o.id === ALL_USERS_ID);
    if (allUsersIndex > -1) {
      const allUsers = sorted.splice(allUsersIndex, 1)[0];
      sorted.unshift(allUsers);
    }
    return sorted;
  }, [filteredItems]);

  return (
    <div className={"w-full"}>
      <DropdownInput
        value={search}
        onChange={setSearch}
        placeholder={"Search user..."}
        hideEnterIcon={true}
      />

      {options.length === 0 && !search && (
        <div className={"max-w-xs mx-auto"}>
          <DropdownInfoText>
            {"No users available to select."}
          </DropdownInfoText>
        </div>
      )}

      {filteredItems.length === 0 && search !== "" && (
        <div className={"px-10"}>
          <DropdownInfoText>
            There are no users matching your search.
          </DropdownInfoText>
        </div>
      )}

      {sortedOptions.length > 0 && (
        <VirtualScrollAreaList
          items={sortedOptions}
          estimatedItemHeight={48}
          maxHeight={300}
          scrollAreaClassName={"pt-0"}
          onSelect={(item) => {
            if (item.id === ALL_USERS_ID) {
              onChange(undefined);
            } else {
              onChange(item.email === value ? undefined : item.email);
            }
            close();
          }}
          renderItem={(user) => {
            const isSystemUser = user.email === "NetBird";
            const isSelected =
              value === user.email ||
              (user.id === ALL_USERS_ID && !value);
            return (
              <div
                className={"flex items-center gap-2 w-full"}
                data-selected={isSelected || undefined}
              >
                {user.id === ALL_USERS_ID ? (
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

                <div className={"flex flex-col text-xs w-full min-w-0"}>
                  <span className={"text-nb-gray-200 flex items-center gap-1.5"}>
                    <TextWithTooltip
                      text={isSystemUser ? "System" : user?.name || user?.id}
                      maxChars={22}
                    />
                  </span>
                  <span
                    className={
                      "text-nb-gray-400 font-light flex items-center gap-1"
                    }
                  >
                    <TextWithTooltip
                      text={user?.email || "NetBird"}
                      maxChars={22}
                    />
                  </span>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

export function formatUsersChip(
  value: string | undefined,
  options: UserOption[],
): string | null {
  if (!value) return null;
  const user = options.find((u) => u.email === value);
  return user?.name || user?.email || value;
}
