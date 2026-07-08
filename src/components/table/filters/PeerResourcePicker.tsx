"use client";

import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Tabs, TabsContent, TabsTrigger } from "@components/Tabs";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import { cn } from "@utils/helpers";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { sortBy } from "lodash";
import {
  CheckIcon,
  GlobeIcon,
  Layers3Icon,
  MonitorIcon,
  NetworkIcon,
  ServerIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

// PeerResourcePicker — single-select endpoint picker with two tabs (Peers /
// Resources), mirroring the Audit Logs user filter's search list. The value
// stored on the column filter is the endpoint id (a peer id or a network
// resource id), which maps to the source_id / destination_id query params.
export type PeerResourceOption = {
  id: string;
  name: string;
  sublabel?: string;
  kind: "peer" | "resource" | "user";
  resourceType?: "domain" | "host" | "subnet";
  connected?: boolean;
};

type Props = {
  value: string | undefined;
  // Emits the full option (not just the id) so callers can route the selection
  // to the right query param by kind (e.g. a user maps to user_id, not source_id).
  onChange: (next: PeerResourceOption | undefined) => void;
  close: () => void;
  peers: PeerResourceOption[];
  resources: PeerResourceOption[];
  // When provided, a third "Users" tab is shown.
  users?: PeerResourceOption[];
};

const searchPredicate = (item: PeerResourceOption, query: string) => {
  const q = query.toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    (item.sublabel?.toLowerCase().includes(q) ?? false)
  );
};

function OptionIcon({ item }: { item: PeerResourceOption }) {
  const icon =
    item.kind === "peer" ? (
      <MonitorIcon size={14} />
    ) : item.resourceType === "domain" ? (
      <GlobeIcon size={14} />
    ) : item.resourceType === "subnet" ? (
      <NetworkIcon size={14} />
    ) : (
      <ServerIcon size={14} />
    );

  return (
    <div
      className={
        "w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-nb-gray-900 text-nb-gray-300 relative"
      }
    >
      {icon}
      {item.kind === "peer" && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-nb-gray-940",
            item.connected ? "bg-green-500" : "bg-nb-gray-500",
          )}
        />
      )}
    </div>
  );
}

function OptionList({
  options,
  value,
  onSelect,
  emptyText,
}: {
  options: PeerResourceOption[];
  value: string | undefined;
  onSelect: (item: PeerResourceOption) => void;
  emptyText: string;
}) {
  const [filteredItems, search, setSearch] = useSearch(
    options,
    searchPredicate,
    { filter: true, debounce: 150 },
  );

  const sortedOptions = React.useMemo(
    () => sortBy(filteredItems, ["name"]),
    [filteredItems],
  );

  return (
    <div className={"w-full"}>
      <DropdownInput
        value={search}
        onChange={setSearch}
        placeholder={"Search..."}
        hideEnterIcon={true}
      />

      {options.length === 0 && !search && (
        <div className={"max-w-xs mx-auto"}>
          <DropdownInfoText>{emptyText}</DropdownInfoText>
        </div>
      )}

      {filteredItems.length === 0 && search !== "" && (
        <div className={"px-10"}>
          <DropdownInfoText>No matching results.</DropdownInfoText>
        </div>
      )}

      {sortedOptions.length > 0 && (
        <VirtualScrollAreaList
          items={sortedOptions}
          estimatedItemHeight={48}
          maxHeight={280}
          scrollAreaClassName={"pt-0"}
          onSelect={onSelect}
          renderItem={(item) => {
            const isSelected = item.id === value;
            return (
              <div
                className={"flex items-center gap-2 w-full"}
                data-selected={isSelected || undefined}
              >
                {item.kind === "user" ? (
                  <SmallUserAvatar
                    name={item.name}
                    email={item.sublabel}
                    id={item.id}
                  />
                ) : (
                  <OptionIcon item={item} />
                )}
                <div className={"flex flex-col text-xs w-full min-w-0"}>
                  <span
                    className={"text-nb-gray-200 flex items-center gap-1.5"}
                  >
                    <TextWithTooltip text={item.name} maxChars={20} />
                  </span>
                  {item.sublabel && (
                    <span
                      className={
                        "text-nb-gray-400 font-light flex items-center gap-1"
                      }
                    >
                      <TextWithTooltip text={item.sublabel} maxChars={20} />
                    </span>
                  )}
                </div>
                {isSelected && (
                  <CheckIcon
                    size={14}
                    className={"shrink-0 text-netbird ml-auto"}
                  />
                )}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

export function PeerResourcePicker({
  value,
  onChange,
  close,
  peers,
  resources,
  users,
}: Props) {
  const [tab, setTab] = useState<string>(() => {
    if (value) {
      if (users?.some((u) => u.id === value)) return "users";
      if (resources.some((r) => r.id === value)) return "resources";
      return "peers";
    }
    return users ? "users" : "peers";
  });

  const handleSelect = (item: PeerResourceOption) => {
    onChange(item.id === value ? undefined : item);
    close();
  };

  return (
    <div className={"w-full"}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsPrimitive.List
          className={"relative flex w-full text-neutral-500 dark:text-nb-gray-400"}
        >
          {users && (
            <TabsTrigger
              value={"users"}
              className={"flex-1 gap-1.5 px-1.5 text-xs"}
            >
              <UsersIcon size={13} className={"shrink-0"} />
              Users
            </TabsTrigger>
          )}
          <TabsTrigger
            value={"peers"}
            className={"flex-1 gap-1.5 px-1.5 text-xs"}
          >
            <PeerIcon size={13} className={"fill-current shrink-0"} />
            Peers
          </TabsTrigger>
          <TabsTrigger
            value={"resources"}
            className={"flex-1 gap-1.5 px-1.5 text-xs"}
          >
            <Layers3Icon size={13} className={"shrink-0"} />
            Resources
          </TabsTrigger>
        </TabsPrimitive.List>
        {users && (
          <TabsContent value={"users"} className={"mt-0 pt-3"}>
            <OptionList
              options={users}
              value={value}
              onSelect={handleSelect}
              emptyText={"No users available to select."}
            />
          </TabsContent>
        )}
        <TabsContent value={"peers"} className={"mt-0 pt-3"}>
          <OptionList
            options={peers}
            value={value}
            onSelect={handleSelect}
            emptyText={"No peers available to select."}
          />
        </TabsContent>
        <TabsContent value={"resources"} className={"mt-0 pt-3"}>
          <OptionList
            options={resources}
            value={value}
            onSelect={handleSelect}
            emptyText={"No resources available to select."}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function formatPeerResourceChip(
  value: string | undefined,
  options: PeerResourceOption[],
): string | null {
  if (!value) return null;
  return options.find((o) => o.id === value)?.name ?? value;
}
