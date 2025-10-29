import Badge from "@components/Badge";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
import { DropdownInfoText } from "@components/DropdownInfoText";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { Radio, RadioItem } from "@components/Radio";
import { ScrollArea } from "@components/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { AccessControlGroupCount } from "@components/ui/AccessControlGroupCount";
import GroupBadge from "@components/ui/GroupBadge";
import GroupBadgeWithEditPeers from "@components/ui/GroupBadgeWithEditPeers";
import ResourceBadge from "@components/ui/ResourceBadge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import useSortedDropdownOptions from "@hooks/useSortedDropdownOptions";
import { IconArrowBack } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import { sortBy, trim, unionBy } from "lodash";
import {
  ChevronsUpDown,
  FolderGit2,
  GlobeIcon,
  Layers3,
  Layers3Icon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  SearchIcon,
  WorkflowIcon,
} from "lucide-react";
import * as React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useGroups } from "@/contexts/GroupsProvider";
import { useElementSize } from "@/hooks/useElementSize";
import type { Group, GroupPeer, GroupResource } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import { PolicyRuleResource } from "@/interfaces/Policy";
import { User } from "@/interfaces/User";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";
import { HorizontalUsersStack } from "@/modules/users/HorizontalUsersStack";

const groupsSearchPredicate = (item: Group, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  return item?.id?.toLowerCase().includes(lowerCaseQuery) ?? false;
};

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
  showResourceCounter?: boolean;
  showResources?: boolean;
  showPeers?: boolean;
  resource?: PolicyRuleResource;
  onResourceChange?: (resource?: PolicyRuleResource) => void;
  placeholder?: string;
  customTrigger?: React.ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
  users?: User[];
  placeholderForSearch?: string;
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
  showResourceCounter = true,
  showResources = false,
  showPeers = false,
  resource,
  onResourceChange,
  placeholder = "Add or select group(s)...",
  customTrigger,
  align = "start",
  side = "bottom",
  users,
  placeholderForSearch = 'Search groups or add new group by pressing "Enter"...',
}: Readonly<MultiSelectProps>) {
  const { data: resources, isLoading: isResourcesLoading } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");

  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");

  const { groups, dropdownOptions, setDropdownOptions, addDropdownOptions } =
    useGroups();

  const searchRef = React.useRef<HTMLInputElement>(null);

  const [inputRef, { width }] = useElementSize<
    HTMLButtonElement | HTMLSpanElement
  >();

  const [open, setOpen] = useState(false);

  const sortedDropdownOptions = useSortedDropdownOptions(
    dropdownOptions,
    values,
    open,
  );

  const [filteredGroups, search, setSearch] = useSearch(
    sortedDropdownOptions,
    groupsSearchPredicate,
    { filter: true, debounce: 150 },
  );

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
    onResourceChange?.(undefined);
    const group = groups?.find((group) => group.name == name);
    const option = dropdownOptions.find((option) => option.name == name);
    const groupPeers: GroupPeer[] | undefined =
      (group?.peers as GroupPeer[]) || [];
    const groupResources: GroupResource[] | undefined =
      (group?.resources as GroupResource[]) || [];

    if (peer) {
      const peerInGroup = groupPeers?.find((p) => p?.id === peer?.id);
      if (!peerInGroup) {
        groupPeers?.push({
          id: peer?.id as string,
          name: peer?.name,
        });
      }
    }

    if (!group && !option) {
      addDropdownOptions([
        { name: name, peers: groupPeers, resources: groupResources },
      ]);
    }

    if (max == 1 && values.length == 1) {
      onChange([
        {
          name: name,
          id: group?.id,
          peers: groupPeers,
          resources: groupResources,
        },
      ]);
    } else {
      onChange((previous) => [
        ...previous,
        {
          name: name,
          id: group?.id,
          peers: groupPeers,
          resources: groupResources,
        },
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

  const [slice, setSlice] = useState(10);

  const [tab, setTab] = useState("groups");

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

  // Reset the search input when switching tabs
  useEffect(() => {
    setSearch("");
    setTimeout(() => {
      searchRef.current?.focus();
    }, 0);
  }, [tab]);

  const searchPlaceholder = useMemo(() => {
    if (tab === "groups") return placeholderForSearch;
    if (tab === "resources") return "Search resource...";
    if (tab === "peers") return "Search peer...";
    return "Search...";
  }, [tab, placeholderForSearch]);

  const selectResource = (resource?: NetworkResource) => {
    onResourceChange?.(
      resource
        ? ({
            id: resource?.id,
            type: resource?.type,
          } as PolicyRuleResource)
        : undefined,
    );
    onChange([]);
  };

  const selectPeer = (peer?: Peer) => {
    if (!peer?.id) return;
    onResourceChange?.({
      id: peer.id,
      type: "peer",
    });
    onChange([]);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen && search.length > 0) {
          setTimeout(() => {
            setSearch("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger asChild>
        {customTrigger ? (
          <div ref={inputRef} className={"w-full"}>
            {customTrigger}
          </div>
        ) : (
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
              {resource && showResources && (
                <ResourceBadge
                  className={"py-[3px]"}
                  resource={resources?.find((r) => r.id === resource.id)}
                  peer={peers?.find((p) => p.id === resource.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectResource();
                  }}
                  showX={true}
                />
              )}
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

              {values.length == 0 && !resource && (
                <span className={"pl-1"}>{placeholder}</span>
              )}
            </div>

            <div className={"pl-2"} data-cy={"group-selector-open-close"}>
              <ChevronsUpDown
                size={18}
                className={
                  "shrink-0 group-hover:text-nb-gray-300 transition-all"
                }
              />
            </div>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{
          width: popoverWidth === "auto" ? width : popoverWidth,
        }}
        align={align}
        side={side}
        sideOffset={10}
      >
        <Command className={"w-full flex"} loop shouldFilter={false}>
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
                placeholder={searchPlaceholder}
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

            <Tabs defaultValue={"groups"} value={tab} onValueChange={setTab}>
              <TabTriggers
                searchRef={searchRef}
                showPeers={showPeers}
                showResources={showResources}
              />
              <TabsContent value={"groups"} className={"p-0 my-0"}>
                <CommandGroup>
                  <ScrollArea
                    className={cn(
                      "max-h-[195px] flex flex-col gap-1 pl-2 py-2 pr-3",
                      filteredGroups.length == 0 && !search && "py-0",
                    )}
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
                        <Badge variant={"gray-ghost"} className={"h-7"}>
                          <FolderGit2 size={12} className={"shrink-0"} />
                          {search}
                        </Badge>
                        <div
                          className={"text-neutral-500 dark:text-nb-gray-300"}
                        >
                          Add this group by pressing{" "}
                          <span className={"font-bold text-netbird"}>
                            {"'Enter'"}
                          </span>
                        </div>
                      </CommandItem>
                    )}

                    {filteredGroups.slice(0, slice).map((option) => {
                      const isSelected =
                        values.find((group) => group.name == option.name) !=
                        undefined;
                      const peerCount =
                        option.peers?.length ?? option?.peers_count ?? 0;

                      const isDisabled = disabledGroups
                        ? disabledGroups?.findIndex(
                            (g) => g.id === option.id,
                          ) !== -1
                        : false;

                      if (hideAllGroup && option?.name === "All") return;

                      return (
                        <FullTooltip
                          content={
                            <div className={"text-xs max-w-xs"}>
                              This group is already part of the routing peer and
                              can not be used for the access control groups.
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
                              if (peer != undefined && option.name == "All")
                                return; // Prevent removing the "All" group
                              if (isDisabled) return;
                              toggleGroupByName(option.name);
                              searchRef.current?.focus();
                            }}
                            className={cn(isDisabled && "opacity-40")}
                            onClick={(e) => e.preventDefault()}
                          >
                            <div className={"flex items-center gap-2"}>
                              <GroupBadge
                                group={option}
                                showNewBadge={true}
                                className={"h-7"}
                              />
                            </div>

                            <div className={"flex items-center gap-5"}>
                              {option?.id && showRoutes && (
                                <AccessControlGroupCount group_id={option.id} />
                              )}

                              {showResourceCounter && (
                                <ResourcesCounter group={option} />
                              )}

                              <div className={"flex gap-3 items-center"}>
                                {!users ? (
                                  <div
                                    className={
                                      "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2"
                                    }
                                  >
                                    <MonitorSmartphoneIcon
                                      size={14}
                                      className={"shrink-0"}
                                    />
                                    {peerCount} Peer(s)
                                  </div>
                                ) : (
                                  <UsersCounter
                                    group={option}
                                    users={users}
                                    selected={isSelected}
                                  />
                                )}

                                <Checkbox checked={isSelected} />
                              </div>
                            </div>
                          </CommandItem>
                        </FullTooltip>
                      );
                    })}
                  </ScrollArea>
                </CommandGroup>
              </TabsContent>
              {showResources && (
                <TabsContent value={"resources"} className={"p-0 my-0"}>
                  <ResourcesList
                    search={search}
                    resources={resources}
                    isLoading={isResourcesLoading}
                    value={resource}
                    onChange={selectResource}
                  />
                </TabsContent>
              )}
              {showPeers && (
                <TabsContent value={"peers"} className={"p-0 my-0"}>
                  <PeersList
                    search={search}
                    peers={peers}
                    isLoading={isPeersLoading}
                    value={resource}
                    onChange={selectPeer}
                  />
                </TabsContent>
              )}
            </Tabs>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const TabTriggers = ({
  searchRef,
  showResources = false,
  showPeers = false,
}: {
  searchRef: React.MutableRefObject<HTMLInputElement | null>;
  showResources?: boolean;
  showPeers?: boolean;
}) => {
  if (!showResources && !showPeers) return null;

  return (
    <TabsList justify={"start"} className={"px-3"}>
      <TabsTrigger
        value={"groups"}
        className={"text-[.8rem] font-normal"}
        onClick={() => searchRef.current?.focus()}
      >
        <FolderGit2
          className={
            "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
          }
          size={14}
        />
        Groups
      </TabsTrigger>

      {showResources && (
        <TabsTrigger
          value={"resources"}
          className={"text-[.8rem] font-normal"}
          onClick={() => searchRef.current?.focus()}
        >
          <Layers3Icon
            className={
              "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
            }
            size={14}
          />
          Resources
        </TabsTrigger>
      )}

      {showPeers && (
        <TabsTrigger
          value={"peers"}
          className={"text-[.8rem] font-normal"}
          onClick={() => searchRef.current?.focus()}
        >
          <MonitorSmartphoneIcon
            className={
              "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
            }
            size={14}
          />
          Peers
        </TabsTrigger>
      )}
    </TabsList>
  );
};

const UsersCounter = ({
  group,
  users,
  selected,
}: {
  group: Group;
  users: User[];
  selected: boolean;
}) => {
  const usersOfGroup =
    users?.filter((user) => user.auto_groups.includes(group.id as string)) ||
    [];

  if (usersOfGroup.length === 0) return null;

  return (
    <HorizontalUsersStack
      users={usersOfGroup}
      max={3}
      avatarClassName={cn(
        "border-nb-gray-920",
        "bg-nb-gray-800 group-hover/user-stack:bg-nb-gray-700",
        "group-hover/command-item:border-nb-gray-910",
      )}
    />
  );
};

const ResourcesCounter = ({ group }: { group: Group }) => {
  return group?.resources_count && group.resources_count > 0 ? (
    <div
      className={
        "text-nb-gray-300 font-medium flex items-center gap-2 transition-all"
      }
    >
      <Layers3 size={14} className={"shrink-0"} />
      {group.resources_count} Resource(s)
    </div>
  ) : null;
};

const resourcesSearchPredicate = (item: NetworkResource, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  return item.address.toLowerCase().includes(lowerCaseQuery);
};

const ResourcesList = ({
  search,
  resources,
  isLoading,
  value,
  onChange,
}: {
  search: string;
  resources?: NetworkResource[];
  isLoading: boolean;
  value?: PolicyRuleResource;
  onChange: (resource: NetworkResource) => void;
}) => {
  const [filteredItems, _, setSearch] = useSearch(
    resources || [],
    resourcesSearchPredicate,
    { filter: true, debounce: 150 },
  );

  useEffect(() => {
    setSearch(search);
  }, [search, setSearch]);

  if (isLoading) {
    return (
      <div className={"max-h-[195px] flex flex-col gap-1 py-2 px-2"}>
        <Skeleton height={42} className={"rounded-md"} />
        <Skeleton height={42} className={"rounded-md"} />
        <Skeleton height={42} className={"rounded-md"} />
        <Skeleton height={42} className={"rounded-md"} />
      </div>
    );
  }

  if (search != "" && filteredItems.length == 0) {
    return (
      <DropdownInfoText className={"mt-5 max-w-sm mx-auto"}>
        There are no resources matching your search. Please try a different
        search term.
      </DropdownInfoText>
    );
  }

  if (search == "" && filteredItems.length == 0) {
    return (
      <DropdownInfoText className={"mt-5 max-w-sm mx-auto"}>
        There are no resources available yet. <br />
        Go to <InlineLink href={"/networks"}>Networks</InlineLink> to add some
        resources.
      </DropdownInfoText>
    );
  }

  return (
    <Radio defaultValue={value?.id} name={"resource"} value={value?.id}>
      <VirtualScrollAreaList
        items={filteredItems}
        onSelect={onChange}
        itemClassName={"dark:aria-selected:bg-nb-gray-800/20"}
        renderItem={(res) => {
          return (
            <Fragment key={res.id}>
              <div className={"flex items-center gap-2"}>
                <Badge
                  useHover={true}
                  data-cy={"group-badge"}
                  variant={"gray-ghost"}
                  className={cn("transition-all group whitespace-nowrap h-7")}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  {res.type === "host" && (
                    <WorkflowIcon size={12} className={"shrink-0"} />
                  )}
                  {res.type === "domain" && (
                    <GlobeIcon size={12} className={"shrink-0"} />
                  )}
                  {res.type === "subnet" && (
                    <NetworkIcon size={12} className={"shrink-0"} />
                  )}

                  <TextWithTooltip text={res?.name || ""} maxChars={20} />
                </Badge>
              </div>

              <div className={"flex items-center gap-5"}>
                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2"
                  }
                >
                  {res.address}
                  <RadioItem value={res.id} />
                </div>
              </div>
            </Fragment>
          );
        }}
      />
    </Radio>
  );
};

const peersSearchPredicate = (item: Peer, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  return item.ip.toLowerCase().includes(lowerCaseQuery);
};

const PeersList = ({
  search,
  peers,
  isLoading,
  value,
  onChange,
}: {
  search: string;
  peers?: Peer[];
  isLoading: boolean;
  value?: PolicyRuleResource;
  onChange: (peer: Peer) => void;
}) => {
  const [filteredItems, _, setSearch] = useSearch(
    peers || [],
    peersSearchPredicate,
    { filter: true, debounce: 150 },
  );

  useEffect(() => {
    setSearch(search);
  }, [search, setSearch]);

  if (isLoading) {
    return (
      <div className={"max-h-[195px] flex flex-col gap-1 py-2 px-2"}>
        <Skeleton height={42} className={"rounded-md"} />
        <Skeleton height={42} className={"rounded-md"} />
        <Skeleton height={42} className={"rounded-md"} />
        <Skeleton height={42} className={"rounded-md"} />
      </div>
    );
  }

  if (search != "" && filteredItems.length == 0) {
    return (
      <DropdownInfoText className={"mt-5 max-w-sm mx-auto"}>
        There are no peers matching your search. Please try a different search
        term.
      </DropdownInfoText>
    );
  }

  if (search == "" && filteredItems.length == 0) {
    return (
      <DropdownInfoText className={"mt-5 max-w-sm mx-auto"}>
        There are no peers available yet. <br />
        Go to <InlineLink href={"/peers"}>Peers</InlineLink> to add some peers.
      </DropdownInfoText>
    );
  }

  return (
    <Radio defaultValue={value?.id} name={"peer"} value={value?.id}>
      <VirtualScrollAreaList
        items={filteredItems}
        onSelect={onChange}
        itemClassName={"dark:aria-selected:bg-nb-gray-800/20"}
        renderItem={(res) => {
          if (!res?.id) return;

          return (
            <Fragment key={res.id}>
              <div className={"flex items-center gap-2"}>
                <Badge
                  useHover={true}
                  data-cy={"group-badge"}
                  variant={"gray-ghost"}
                  className={cn(
                    "transition-all group whitespace-nowrap h-7 px-2",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <PeerOperatingSystemIcon os={res.os} />
                  <TextWithTooltip text={res?.name || ""} maxChars={20} />
                </Badge>
              </div>

              <div className={"flex items-center gap-5"}>
                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2"
                  }
                >
                  {res.ip}
                  <RadioItem value={res.id} />
                </div>
              </div>
            </Fragment>
          );
        }}
      />
    </Radio>
  );
};
