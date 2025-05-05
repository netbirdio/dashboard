import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import { cn } from "@utils/helpers";
import { ChevronsUpDown, MapPin } from "lucide-react";
import * as React from "react";
import { memo, useState } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { User } from "@/interfaces/User";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

const MapPinIcon = memo(() => <MapPin size={12} />);
MapPinIcon.displayName = "MapPinIcon";

interface MultiSelectProps {
  value?: User;
  onChange: React.Dispatch<React.SetStateAction<User | undefined>>;
  excludedPeers?: string[];
  disabled?: boolean;
  options?: User[];
  placeholder?: string;
}

const searchPredicate = (u: User, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  try {
    if (u.name.toLowerCase().includes(lowerCaseQuery)) return true;
    return !!u?.email?.toLowerCase().includes(lowerCaseQuery);
  } catch (e) {
    return false;
  }
};

export function UserSelector({
  onChange,
  value,
  disabled = false,
  options = [],
  placeholder = "Select a user...",
}: MultiSelectProps) {
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();

  const [filteredItems, search, setSearch] = useSearch(
    options,
    searchPredicate,
    { filter: true, debounce: 150 },
  );

  const toggleUser = (user: User) => {
    const isSelected = value && value.id == user.id;
    if (isSelected) {
      onChange(undefined);
    } else {
      onChange(user);
      setSearch("");
    }
    setOpen(false);
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
      <PopoverTrigger asChild>
        <button
          className={cn(
            "min-h-[46px] w-full relative items-center group",
            "border border-neutral-200 dark:border-nb-gray-700 justify-between py-2 px-3",
            "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer enabled:hover:dark:bg-nb-gray-900/50",
            "disabled:opacity-40 disabled:cursor-default",
          )}
          disabled={disabled}
          ref={inputRef}
        >
          <div
            className={
              "flex items-center w-full gap-2 border-nb-gray-700 flex-wrap h-full"
            }
          >
            {value ? (
              <UserListItem
                user={value}
                className={"bg-nb-gray-800"}
                variant={"selected"}
              />
            ) : (
              <span>{placeholder}</span>
            )}
          </div>

          <ChevronsUpDown size={18} className={"shrink-0"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        hideWhenDetached={false}
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{
          width: width,
        }}
        align="start"
        side={"top"}
        sideOffset={10}
      >
        <div className={"w-full"}>
          <DropdownInput
            value={search}
            onChange={setSearch}
            hideEnterIcon={true}
            placeholder={"Search for users by name or email..."}
          />

          {options.length == 0 && !search && (
            <div className={"max-w-xs mx-auto"}>
              <DropdownInfoText>
                {
                  "There are no users to select. Invite some users for this tenant before unlinking."
                }
              </DropdownInfoText>
            </div>
          )}

          {filteredItems.length == 0 && search != "" && (
            <DropdownInfoText>
              There are no users matching your search.
            </DropdownInfoText>
          )}

          {filteredItems.length > 0 && (
            <VirtualScrollAreaList
              items={filteredItems}
              onSelect={toggleUser}
              estimatedItemHeight={52}
              scrollAreaClassName={"pt-0"}
              renderItem={(option) => {
                return (
                  <div>
                    <UserListItem user={option} className={"bg-nb-gray-800"} />
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

type UserListItemProps = {
  user: User;
  className?: string;
  variant?: "default" | "selected";
};

export const UserListItem = ({
  user,
  className,
  variant,
}: UserListItemProps) => {
  const isSystemUser = user?.email === "NetBird" || user?.email === "";
  const maxChars = variant === "selected" ? 30 : 20;

  return (
    <div className={"flex items-center gap-2 w-full text-left"}>
      <SmallUserAvatar
        name={user?.name}
        email={user?.email}
        id={user?.id}
        className={cn(
          variant === "selected" && "w-5 h-5 text-[9px]",
          className,
        )}
      />
      <div
        className={cn(
          "flex flex-col w-full",
          variant === "selected" && "flex-row",
        )}
      >
        <span
          className={cn(
            "text-nb-gray-200 flex items-center relative gap-1.5 w-full text-xs",
            variant === "selected" && "text-[0.85rem]",
          )}
        >
          <TextWithTooltip
            text={isSystemUser ? "System" : user?.name || user?.id}
            maxChars={maxChars}
          />
        </span>

        <span
          className={cn(
            "text-nb-gray-350 font-light flex items-center gap-1 text-xs",
            variant === "selected" && "text-xs pr-3 font-normal",
          )}
        >
          <TextWithTooltip
            text={user?.email || "NetBird"}
            maxChars={maxChars}
          />
        </span>
      </div>
    </div>
  );
};
