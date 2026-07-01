import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import { Table } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { FilterIcon, Share2Icon } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTrafficEventProtocol,
  TrafficEvent,
  TrafficEventDirection,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventProtocol } from "@/cloud/traffic-events/interfaces/TrafficEventProtocol";
import { getTrafficEventTypeText } from "@/cloud/traffic-events/TrafficEventsTable";

interface Props {
  table: Table<TrafficEvent>;
  disabled?: boolean;
  filters?: {
    type?: string[];
    direction?: string[];
    protocol?: string[];
  };
  onFilterChange?: (filters: {
    type?: string[];
    direction?: string[];
    protocol?: string[];
  }) => void;
  closeOnSelect?: boolean;
}

interface CombinedFilter {
  id: string;
  displayText: string;
  type?: string;
  connection_type?: string;
  direction?: string;
  protocol?: string;
}

const searchPredicate = (item: any, query: any) => {
  const lowerCaseQuery = query.toLowerCase();
  let itemValue = String(item?.displayText || "").toLowerCase();
  return itemValue.includes(lowerCaseQuery);
};

export interface FixedFilterItem {
  id: string;
  columnId: keyof TrafficEvent | string;
  value: string;
  filterType: "type" | "protocol";
  filterValue: CombinedFilter;
  displayText: string;
  item: () => string | React.ReactNode;
}

const getCombinedFilterId = (
  type?: string,
  direction?: string,
  protocol?: string,
): string => {
  return `${type || ""}|${direction || ""}|${protocol || ""}`;
};

export function TrafficEventsFilter({
  table,
  disabled = false,
  filters = {},
  onFilterChange,
  closeOnSelect = false,
}: Readonly<Props>) {
  const filterItems = useMemo(() => getFixedTypeFilters(), []);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([]);

  const updateTableFilters = useCallback(
    (activeIds: string[]) => {
      const typeColumn = table.getColumn("type");
      const protocolColumn = table.getColumn("protocol");

      if (typeColumn) {
        const typeItems = filterItems.filter(
          (item) => activeIds.includes(item.id) && item.filterType === "type",
        );
        const typeValues = typeItems.map((item) => item.value);

        if (typeValues.length > 0) {
          typeColumn.setFilterValue(typeValues);
        } else {
          typeColumn.setFilterValue(undefined);
        }
      }

      if (protocolColumn) {
        const protocolItems = filterItems.filter(
          (item) =>
            activeIds.includes(item.id) && item.filterType === "protocol",
        );
        const protocolValues = protocolItems.map((item) => item.value);

        if (protocolValues.length > 0) {
          protocolColumn.setFilterValue(protocolValues);
        } else {
          protocolColumn.setFilterValue(undefined);
        }
      }
    },
    [table, filterItems],
  );

  useEffect(() => {
    const activeIds: string[] = [];

    if (
      !filters.type?.length &&
      !filters.direction?.length &&
      !filters.protocol?.length
    ) {
      setActiveFilterIds([]);
      updateTableFilters([]);
      return;
    }

    filterItems.forEach((item) => {
      const filter = item.filterValue;
      let isMatch = true;

      if (filters.type && filter.type) {
        isMatch = isMatch && filters.type.includes(filter.type);
      }

      if (filters.direction && filter.direction) {
        isMatch = isMatch && filters.direction.includes(filter.direction);
      }

      if (filters.protocol && filter.protocol) {
        isMatch = isMatch && filters.protocol.includes(filter.protocol);
      }

      if (
        isMatch &&
        (filter.type ||
          filter.connection_type ||
          filter.direction ||
          filter.protocol)
      ) {
        activeIds.push(item.id);
      }
    });

    setActiveFilterIds(activeIds);
    updateTableFilters(activeIds);
  }, [filters, filterItems, updateTableFilters]);

  const [filteredItems, search, setSearch] = useSearch<FixedFilterItem>(
    filterItems,
    searchPredicate,
    {
      filter: true,
      debounce: 500,
    },
  );

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      setTimeout(() => {
        setSearch("");
      }, 100);
    }
  };

  const onSelect = (item: FixedFilterItem) => {
    table.setPageIndex(0);

    let newActiveFilterIds;
    if (activeFilterIds.includes(item.id)) {
      newActiveFilterIds = activeFilterIds.filter((id) => id !== item.id);
    } else {
      newActiveFilterIds = [...activeFilterIds, item.id];
    }

    setActiveFilterIds(newActiveFilterIds);
    updateTableFilters(newActiveFilterIds);

    if (onFilterChange) {
      const selectedFilters = newActiveFilterIds
        .map((id) => {
          return filterItems.find((item) => item.id === id)?.filterValue;
        })
        .filter(Boolean) as CombinedFilter[];

      const typeFilters = new Set<string>();
      const connectionTypeFilters = new Set<string>();
      const directionFilters = new Set<string>();
      const protocolFilters = new Set<string>();

      selectedFilters.forEach((filter) => {
        if (filter.type) typeFilters.add(filter.type);
        if (filter.connection_type)
          connectionTypeFilters.add(filter.connection_type);
        if (filter.direction) directionFilters.add(filter.direction);
        if (filter.protocol) protocolFilters.add(filter.protocol);
      });

      const newFilters = {
        type: typeFilters.size > 0 ? Array.from(typeFilters) : undefined,
        connection_type:
          connectionTypeFilters.size > 0
            ? Array.from(connectionTypeFilters)
            : undefined,
        direction:
          directionFilters.size > 0 ? Array.from(directionFilters) : undefined,
        protocol:
          protocolFilters.size > 0 ? Array.from(protocolFilters) : undefined,
      };

      onFilterChange(newFilters);
    }

    if (closeOnSelect) {
      setOpen(false);
    } else {
      searchRef.current?.focus();
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild={true}>
        <Button variant={"secondary"} disabled={disabled}>
          <FilterIcon size={15} className={"shrink-0"} />
          <span>
            <span className={"text-white"}>
              {activeFilterIds.length > 0 && activeFilterIds.length}
            </span>
            {activeFilterIds.length > 0 ? ` Filter(s)` : "Filter"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        hideWhenDetached={false}
        className="w-full p-0 shadow-sm shadow-nb-gray-950"
        style={{
          width: "400px",
        }}
        align="start"
        side={"bottom"}
        sideOffset={10}
        onInteractOutside={(e) => {
          const target = e.target as Node;
          const trigger = document.querySelector(
            '[data-state="open"][aria-expanded="true"]',
          );
          if (trigger && trigger.contains(target)) {
            return;
          }
          setOpen(false);
        }}
      >
        <div className={"w-full"}>
          <DropdownInput
            ref={searchRef}
            value={search}
            onChange={setSearch}
            placeholder={"Search filters..."}
            hideEnterIcon={true}
          />

          {filteredItems.length == 0 && search != "" && (
            <DropdownInfoText className={"mb-4"}>
              There are no filters matching your search.
            </DropdownInfoText>
          )}

          <VirtualScrollAreaList
            items={filteredItems}
            maxHeight={270}
            estimatedItemHeight={36}
            scrollAreaClassName={"pt-0"}
            renderItem={(option) => {
              const isActive = activeFilterIds.includes(option.id);

              return (
                <div
                  className={
                    "text-neutral-500 dark:text-nb-gray-300 font-medium flex items-center gap-2 justify-between w-full"
                  }
                  key={option.id}
                >
                  <div
                    className={
                      "flex items-center gap-2 whitespace-nowrap text-xs font-normal tracking-wide"
                    }
                  >
                    <div>{option?.item()}</div>
                  </div>
                  <Checkbox checked={isActive} />
                </div>
              );
            }}
            onSelect={onSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const getFixedTypeFilters = () => {
  let directions = [
    TrafficEventDirection.EGRESS,
    TrafficEventDirection.INGRESS,
  ];
  let types = [
    TrafficEventType.CONNECTED,
    TrafficEventType.STOPPED,
    TrafficEventType.BLOCKED,
  ];

  const filters: FixedFilterItem[] = [];

  for (const t of types) {
    for (const d of directions) {
      const eventTypeText =
        t === TrafficEventType.CONNECTED
          ? "started"
          : t === TrafficEventType.STOPPED
          ? "stopped"
          : "blocked";
      const directionText =
        d === TrafficEventDirection.INGRESS ? "(inbound)" : "(outbound)";

      const displayText = `Connection ${eventTypeText} ${directionText}`;

      const combinedFilter: CombinedFilter = {
        id: getCombinedFilterId(t, d),
        displayText,
        type: t,
        direction: d,
      };

      filters.push({
        id: combinedFilter.id,
        columnId: "type",
        value: displayText,
        filterType: "type" as const,
        filterValue: combinedFilter,
        displayText,
        item: () => (
          <div className={"flex gap-2 items-center justify-center"}>
            <div className={"px-0.5 flex items-center justify-center"}>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  t == TrafficEventType.STOPPED && "bg-nb-gray-700",
                  t == TrafficEventType.BLOCKED && "bg-red-500",
                  t == TrafficEventType.CONNECTED && "bg-green-500",
                )}
              ></span>
            </div>
            {displayText}
          </div>
        ),
      });
    }
  }

  let protocols: (keyof typeof TrafficEventProtocol)[] = [
    6, // TCP
    17, // UDP
    1, // ICMP
  ];

  for (const p of protocols) {
    const protocolName = getTrafficEventProtocol(p);

    const combinedFilter: CombinedFilter = {
      id: getCombinedFilterId(undefined, undefined, protocolName),
      displayText: protocolName,
      protocol: p?.toString(),
    };

    filters.push({
      id: combinedFilter.id,
      columnId: "protocol",
      value: p?.toString(),
      filterType: "protocol" as const,
      filterValue: combinedFilter,
      displayText: protocolName,
      item: () => (
        <div className={"flex gap-2 items-center justify-center"}>
          <Share2Icon size={14} className={"shrink-0"} />
          {protocolName}
        </div>
      ),
    });
  }

  return filters;
};

type TrafficEventTypeFilterItemProps = {
  t: TrafficEventType;
  isP2P: boolean;
  direction: TrafficEventDirection;
};

const TrafficEventTypeFilterItem = ({
  t,
  isP2P,
  direction,
}: TrafficEventTypeFilterItemProps) => {
  return (
    <div className={"flex gap-2 items-center justify-center"}>
      <div className={"px-0.5 flex items-center justify-center"}>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            t == TrafficEventType.STOPPED && "bg-nb-gray-700",
            t == TrafficEventType.BLOCKED && "bg-red-500",
            t == TrafficEventType.CONNECTED && "bg-green-500",
          )}
        ></span>
      </div>
      {getTrafficEventTypeText(t, isP2P, direction)}
    </div>
  );
};

const TrafficEventProtocolFilterItem = ({
  p,
}: {
  p: keyof typeof TrafficEventProtocol;
}) => {
  const protocolName = getTrafficEventProtocol(p);
  return (
    <div className={"flex gap-2 items-center justify-center"}>
      <Share2Icon size={14} className={"shrink-0"} />
      {protocolName}
    </div>
  );
};
