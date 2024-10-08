import Badge from "@components/Badge";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import FullTooltip from "@components/FullTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { AccessControlGroupCount } from "@components/ui/AccessControlGroupCount";
import GroupBadge from "@components/ui/GroupBadge";
import GroupBadgeWithEditPeers from "@components/ui/GroupBadgeWithEditPeers";
import useSortedDropdownOptions from "@hooks/useSortedDropdownOptions";
import { IconArrowBack } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { sortBy, trim, unionBy } from "lodash";
import {
  ChevronsUpDown,
  FolderGit2,
  MonitorSmartphoneIcon,
  SearchIcon,
} from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { useElementSize } from "@/hooks/useElementSize";
import type { Group, GroupPeer } from "@/interfaces/Group";
import type { Peer } from "@/interfaces/Peer";

interface MultiSelectProps {
  values: Group[];
  onChange: React.Dispatch<React.SetStateAction<Group[]>>;
  peer?: Peer;
  max?: number;
  disabled?: boolean;
  popoverWidth?: "auto" | number;
  hideAllGroup?: boolean;
  showPeerCount?: boolean;
  disableInlineRemoveGroup?: boolean;
  saveGroupAssignments?: boolean;
  showRoutes?: boolean;
  disabledGroups?: Group[];
  dataCy?: string;
}
export function PeerGroupSelector({
  onChange,
  values,
  peer = undefined,
  max,
  disabled = false,
  popoverWidth = "auto",
  hideAllGroup = false,
  showPeerCount = false,
  disableInlineRemoveGroup = false,
  saveGroupAssignments = true,
  showRoutes = false,
  disabledGroups,
  dataCy = "group-selector-dropdown",
}: Readonly<MultiSelectProps>) {
  const { groups, dropdownOptions, setDropdownOptions, addDropdownOptions } =
    useGroups();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  // Update dropdown options when groups change
  useEffect(() => {
    if (!groups) return;
    const sortedGroups = sortBy([...groups], "name");

    const clientGroups = dropdownOptions.filter(
      (group) => group.keepClientState,
    );
    let uniqueGroups = unionBy(sortedGroups, dropdownOptions, "name");
    uniqueGroups = unionBy(clientGroups, uniqueGroups, "name");

    uniqueGroups = hideAllGroup
      ? uniqueGroups.filter((group) => group.name !== "All")
      : uniqueGroups;

    setDropdownOptions(uniqueGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const toggleGroupByName = (name: string) => {
    const isSelected = values.find((group) => group.name == name) != undefined;
    if (isSelected) {
      deselectGroup(name);
    } else {
      selectGroup(name);
    }
  };

  // Add group to the groupOptions if it does not exist
  const selectGroup = (name: string) => {
    const group = groups?.find((group) => group.name == name);
    const option = dropdownOptions.find((option) => option.name == name);
    const groupPeers: GroupPeer[] | undefined =
      (group?.peers as GroupPeer[]) || [];

    if (peer) groupPeers?.push({ id: peer?.id as string, name: peer?.name });

    if (!group && !option) {
      addDropdownOptions([{ name: name, peers: groupPeers }]);
    }

    if (max == 1 && values.length == 1) {
      onChange([{ name: name, id: group?.id, peers: groupPeers }]);
    } else {
      onChange((previous) => [
        ...previous,
        { name: name, id: group?.id, peers: groupPeers },
      ]);
    }

    if (max == 1) setOpen(false);
  };

  // Remove group from the groupOptions if it does not have an id
  const deselectGroup = (name: string) => {
    onChange((previous) => {
      return previous.filter((group) => group.name != name);
    });
  };

  // Check if the searched group does not exist
  const searchedGroupNotFound = useMemo(() => {
    const isSearching = search.length > 0;
    const groupDoesNotExist =
      dropdownOptions.filter((item) => item.name == trim(search)).length == 0;
    const isAllGroup = search.toLowerCase() == "all";
    return isSearching && groupDoesNotExist && !isAllGroup;
  }, [search, dropdownOptions]);

  const [open, setOpen] = useState(false);

  const folderIcon = useMemo(() => {
    return <FolderGit2 size={12} className={"shrink-0"} />;
  }, []);

  const peerIcon = useMemo(() => {
    return <MonitorSmartphoneIcon size={14} className={"shrink-0"} />;
  }, []);

  const [slice, setSlice] = useState(10);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setSlice(dropdownOptions.length);
      }, 100);
    } else {
      setSlice(10);
    }
  }, [open, dropdownOptions]);

  const onPeerAssignmentChange = (oldGroup: Group, newGroup: Group) => {
    const filtered = values.filter((group) => group.name !== oldGroup.name);
    const union = unionBy([newGroup], filtered, "name");
    onChange(union);
  };

  const sortedDropdownOptions = useSortedDropdownOptions(
    dropdownOptions,
    values,
    open,
  );

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && search.length > 0) {
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
            "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer hover:dark:bg-nb-gray-900/50",
            "disabled:pointer-events-none disabled:opacity-30 transition-all",
          )}
          disabled={disabled}
          data-cy={dataCy}
          ref={inputRef}
        >
          <div
            className={
              "flex items-center gap-2 border-nb-gray-700 flex-wrap h-full"
            }
          >
            {values.map((group) => {
              return (
                <div
                  key={group.name}
                  className={cn(
                    showPeerCount
                      ? "flex gap-x-1 gap-y-2 items-center justify-between w-full"
                      : "",
                  )}
                >
                  {showPeerCount ? (
                    <GroupBadgeWithEditPeers
                      className={"py-[3px]"}
                      group={group}
                      key={group.name}
                      showNewBadge={true}
                      onPeerAssignmentChange={onPeerAssignmentChange}
                      useSave={saveGroupAssignments}
                    />
                  ) : (
                    <GroupBadge
                      className={"py-[3px]"}
                      group={group}
                      key={group.name}
                      showNewBadge={true}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (disableInlineRemoveGroup) return;
                        if (peer != undefined && group.name == "All") return; // Prevent removing the "All" group
                        toggleGroupByName(group.name);
                      }}
                      showX={
                        peer != undefined
                          ? group.name !== "All"
                          : !disableInlineRemoveGroup
                      }
                    />
                  )}
                </div>
              );
            })}

            {values.length == 0 && (
              <span className={"pl-1"}>Add or select group(s)...</span>
            )}
          </div>

          <div className={"pl-2"}>
            <ChevronsUpDown
              size={18}
              className={"shrink-0 group-hover:text-nb-gray-300 transition-all"}
            />
          </div>
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
                data-cy={"group-search-input"}
                className={cn(
                  "min-h-[42px] w-full relative",
                  "border-b-0 border-t-0 border-r-0 border-l-0 border-neutral-200 dark:border-nb-gray-700 items-center",
                  "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
                  "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-10",
                )}
                ref={searchRef}
                value={search}
                onValueChange={setSearch}
                placeholder={
                  'Search groups or add new group by pressing "Enter"...'
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

            <CommandGroup>
              <ScrollArea
                className={"max-h-[195px] flex flex-col gap-1 pl-2 py-2 pr-3"}
              >
                {searchedGroupNotFound && (
                  <CommandItem
                    key={search}
                    onSelect={() => {
                      toggleGroupByName(search);
                      searchRef.current?.focus();
                    }}
                    value={search}
                    onClick={(e) => e.preventDefault()}
                  >
                    <Badge variant={"gray-ghost"}>
                      {folderIcon}
                      {search}
                    </Badge>
                    <div className={"text-neutral-500 dark:text-nb-gray-300"}>
                      Add this group by pressing{" "}
                      <span className={"font-bold text-netbird"}>
                        {"'Enter'"}
                      </span>
                    </div>
                  </CommandItem>
                )}

                {sortedDropdownOptions.slice(0, slice).map((option) => {
                  const isSelected =
                    values.find((group) => group.name == option.name) !=
                    undefined;
                  const peerCount =
                    option.peers?.length ?? option?.peers_count ?? 0;

                  const isDisabled = disabledGroups
                    ? disabledGroups?.findIndex((g) => g.id === option.id) !==
                      -1
                    : false;

                  return (
                    <FullTooltip
                      content={
                        <div className={"text-xs max-w-xs"}>
                          This group is already part of the routing peer and can
                          not be used for the access control groups.
                        </div>
                      }
                      disabled={!isDisabled}
                      className={"w-full block"}
                      key={option.name}
                    >
                      <CommandItem
                        key={option.name}
                        value={option.name + option.id}
                        disabled={isDisabled}
                        onSelect={() => {
                          if (peer != undefined && option.name == "All") return; // Prevent removing the "All" group
                          if (isDisabled) return;
                          toggleGroupByName(option.name);
                          searchRef.current?.focus();
                        }}
                        className={cn(isDisabled && "opacity-40")}
                        onClick={(e) => e.preventDefault()}
                      >
                        <div className={"flex items-center gap-2"}>
                          <GroupBadge group={option} showNewBadge={true} />
                        </div>

                        <div className={"flex items-center gap-5"}>
                          {option?.id && showRoutes && (
                            <AccessControlGroupCount group_id={option.id} />
                          )}

                          <div
                            className={
                              "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2"
                            }
                          >
                            {peerIcon}
                            {peerCount} Peer(s)
                            <Checkbox checked={isSelected} />
                          </div>
                        </div>
                      </CommandItem>
                    </FullTooltip>
                  );
                })}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
