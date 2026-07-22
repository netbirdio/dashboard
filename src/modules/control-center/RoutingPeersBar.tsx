import { cn, singularize } from "@utils/helpers";
import {
  AlertTriangleIcon,
  ChevronsUpDown,
  CirclePlusIcon,
  SquarePenIcon,
} from "lucide-react";
import * as React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { DropdownInput } from "@components/DropdownInput";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { useSearch } from "@hooks/useSearch";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";

// Traffic light: gray = 0, yellow = 1, green ≥ 2 (HA).
export const RoutingPeersIndicator = ({
  count,
  hideWhenZero = false,
  dotSize = 8,
  className,
  zeroLabel,
}: {
  count: number;
  hideWhenZero?: boolean;
  dotSize?: number;
  className?: string;
  zeroLabel?: string;
}) => {
  if (hideWhenZero && count === 0) return null;
  // The status bar (has a zeroLabel) flags "no routing peers" with a yellow
  // AlertTriangle, same as a resource's "No Network" — a missing router means
  // the network can't route. Elsewhere the traffic-light dot is kept.
  const showAlert = count === 0 && !!zeroLabel;
  return (
    <div className={cn("flex items-center", className)}>
      {showAlert ? (
        <AlertTriangleIcon
          size={dotSize + 5}
          className={"shrink-0 text-yellow-400"}
        />
      ) : (
        <CircleIcon
          size={dotSize}
          className={cn(
            "shrink-0 block",
            count === 0 && "bg-nb-gray-500",
            count === 1 && "bg-yellow-400",
            count > 1 && "bg-green-400",
          )}
        />
      )}
      {count === 0 && zeroLabel
        ? zeroLabel
        : singularize("Routing Peers", count, true)}
    </div>
  );
};

// One row of the routing-peers dropdown: a peer router (OS icon + name) or a
// group router (group badge + "Name (x Peers)").
export type RoutingPeerRow = {
  key: string;
  peerOs?: string;
  name: string;
  isGroup: boolean;
  peersCount?: number;
  enabled: boolean;
  // Hover-reveal edit action (pencil); rows without one are read-only.
  onEdit?: () => void;
};

// Counts PEERS, not routers: a group router contributes its peers, a peer
// router one — disabled routers contribute nothing.
export const getRoutingPeerCount = (rows: RoutingPeerRow[]) =>
  rows.reduce(
    (sum, r) => (r.enabled ? sum + (r.isGroup ? r.peersCount ?? 0 : 1) : sum),
    0,
  );

// Disabled routers last; within each half groups first (most peers on top),
// then peer routers by name.
export const sortRoutingPeerRows = (rows: RoutingPeerRow[]) =>
  rows.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    if (a.isGroup !== b.isGroup) return a.isGroup ? -1 : 1;
    if (a.isGroup && b.isGroup)
      return (b.peersCount ?? 0) - (a.peersCount ?? 0);
    return a.name.localeCompare(b.name);
  });

// Routing-peers button group `[● status ⌄ | ⊕ Add]`: the status button opens
// a PeerSelector-style popover (search + one row per router); with no routers
// it triggers onAdd directly. Without onAdd the bar is read-only (no Add
// segment). Shared by the draft network frame's floating bar, the live
// network frames, and the live single-network header.
export const RoutingPeersBar = ({
  rows,
  count,
  onAdd,
}: {
  rows: RoutingPeerRow[];
  count: number;
  onAdd?: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [filteredRows, search, setSearch] = useSearch(
    rows,
    (row: RoutingPeerRow, query: string) =>
      row.name.toLowerCase().includes(query.toLowerCase()),
    { filter: true, debounce: 150 },
  );
  const hasRouters = rows.length > 0;

  return (
    <div
      className={cn(
        // Fixed height matching the header's network SelectDropdown.
        "flex items-stretch h-[40px] rounded-md overflow-hidden shrink-0",
        "bg-nb-gray-920 border border-gray-700/40",
      )}
    >
      <Popover
        open={open && hasRouters}
        onOpenChange={(isOpen) => {
          if (!isOpen) setTimeout(() => setSearch(""), 100);
          setOpen(isOpen);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type={"button"}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasRouters) onAdd?.();
            }}
            className={cn(
              "flex items-center gap-2 pl-3.5 pr-3 text-xs text-gray-400 whitespace-nowrap outline-none",
              "hover:text-white hover:bg-nb-gray-910 transition-colors",
            )}
          >
            <RoutingPeersIndicator
              count={count}
              dotSize={7}
              className={"gap-1.5"}
              zeroLabel={"No Routing Peer"}
            />
            {/* Same size as the SelectDropdown trigger's chevron. */}
            {hasRouters && <ChevronsUpDown size={16} className={"shrink-0"} />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          hideWhenDetached={false}
          className={"w-[300px] p-0 shadow-sm shadow-nb-gray-950"}
          align={"start"}
          side={"bottom"}
          sideOffset={8}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownInput
            value={search}
            onChange={setSearch}
            placeholder={"Search by peer or group name..."}
            hideEnterIcon={true}
          />
          {filteredRows.length === 0 && search !== "" && (
            <DropdownInfoText>
              There are no routing peers matching your search.
            </DropdownInfoText>
          )}
          <div className={"pb-1 px-1"}>
            {filteredRows.map((row) => (
              <div
                key={row.key}
                className={cn(
                  "group/row flex items-center gap-2.5 rounded-md py-2 pl-3 pr-3",
                  "text-sm text-nb-gray-300 hover:bg-nb-gray-900 hover:text-gray-50",
                  row.onEdit && "cursor-pointer",
                  !row.enabled && "opacity-50",
                )}
                onClick={() => {
                  if (!row.onEdit) return;
                  setOpen(false);
                  row.onEdit();
                }}
              >
                {row.isGroup ? (
                  <span
                    className={
                      "flex h-4 w-4 items-center justify-center shrink-0"
                    }
                  >
                    <GroupBadgeIcon size={14} />
                  </span>
                ) : (
                  <PeerOperatingSystemIcon os={row.peerOs ?? ""} />
                )}
                <span className={"truncate flex-1 min-w-0"}>
                  {row.name}
                  {row.peersCount !== undefined &&
                    ` (${singularize("Peers", row.peersCount, true)})`}
                </span>
                {row.onEdit && (
                  <SquarePenIcon
                    size={13}
                    className={cn(
                      "shrink-0 text-nb-gray-400 group-hover/row:text-white",
                      "opacity-0 group-hover/row:opacity-100 transition-opacity",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {/* Trailing "Add" only once there's a routing peer — with none, the
          status button itself ("No Routing Peer") adds the first. */}
      {hasRouters && onAdd && (
        <button
          type={"button"}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 text-xs whitespace-nowrap outline-none",
            "border-l border-gray-700/40 text-gray-400",
            "hover:text-white hover:bg-nb-gray-910 transition-colors",
          )}
        >
          <CirclePlusIcon size={12} className={"shrink-0"} />
          Add
        </button>
      )}
    </div>
  );
};
