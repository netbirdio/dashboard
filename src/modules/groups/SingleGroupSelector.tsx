import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import GroupBadge from "@components/ui/GroupBadge";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useElementSize } from "@hooks/useElementSize";
import { useSearch } from "@hooks/useSearch";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import { HorizontalUsersStack } from "@/modules/users/HorizontalUsersStack";

type Props = {
  trigger?: React.ReactNode;
  onSelect: (group: Group) => void;
  values: Group[];
  popoverWidth?: number;
  align?: "start" | "end";
  side?: "top" | "bottom";
};

const searchPredicate = (item: Group, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  return item.name.toLowerCase().includes(lowerCaseQuery);
};

export const SingleGroupSelector = ({
  trigger,
  onSelect,
  values,
  popoverWidth = 370,
  align = "end",
  side = "top",
}: Props) => {
  const [inputRef, { width }] = useElementSize<HTMLDivElement>();
  const [open, setOpen] = useState(false);
  const [filteredItems, search, setSearch] = useSearch(
    values,
    searchPredicate,
    { filter: true, debounce: 200 },
  );
  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => {
            setSearch("");
          }, 200);
        }
        setOpen(isOpen);
      }}
    >
      <div className={"relative h-10 pr-2"}>
        <PopoverTrigger asChild>
          <div ref={inputRef}>{trigger}</div>
        </PopoverTrigger>
      </div>
      <PopoverContent
        hideWhenDetached={false}
        className={cn("w-full p-0 m-0 shadow-sm shadow-nb-gray-950")}
        style={{
          width: popoverWidth + "px",
        }}
        align={align}
        side={side}
        sideOffset={10}
        variant={"lighter"}
      >
        <div className={"w-full"}>
          <DropdownInput
            value={search}
            onChange={setSearch}
            placeholder={"Search groups..."}
            hideEnterIcon={true}
          />

          {values.length == 0 && !search && (
            <div className={"max-w-xs mx-auto px-4"}>
              <DropdownInfoText>
                {"Seems like you don't have any groups."}
              </DropdownInfoText>
            </div>
          )}

          {filteredItems.length == 0 && search != "" && (
            <div className={"max-w-xs mx-auto px-4"}>
              <DropdownInfoText>
                There are no groups matching your search. Try another search
                term.
              </DropdownInfoText>
            </div>
          )}

          {filteredItems.length > 0 && (
            <VirtualScrollAreaList
              scrollAreaClassName={"py-0"}
              itemWrapperClassName={""}
              itemClassName={"dark:aria-selected:bg-nb-gray-910"}
              items={filteredItems}
              onSelect={(group) => {
                onSelect(group);
                setOpen(false);
              }}
              estimatedItemHeight={46}
              maxHeight={300}
              renderItem={(option, selected) => {
                return <Item group={option} selected={selected} />;
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

type ItemProps = {
  group: Group;
  selected?: boolean;
};

const Item = ({ group, selected }: ItemProps) => {
  const { users } = useUsers();
  const usersOfGroup =
    users?.filter((user) => user.auto_groups.includes(group.id as string)) ||
    [];

  return (
    <div className={"flex gap-2 items-center w-full group justify-between"}>
      <GroupBadge group={group} />
      <HorizontalUsersStack
        users={usersOfGroup}
        max={3}
        avatarClassName={cn(
          selected ? "border-nb-gray-910" : "border-nb-gray-920",
          "bg-nb-gray-800 group-hover/user-stack:bg-nb-gray-700",
        )}
      />
    </div>
  );
};
