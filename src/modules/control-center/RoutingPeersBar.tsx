import { cn, singularize } from "@utils/helpers";
import {
  AlertTriangleIcon,
  ChevronsUpDown,
  CirclePlusIcon,
  SquarePenIcon,
} from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
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

// Max height of the popover's row list (scrolls beyond it).
const MAX_LIST_HEIGHT = 195;

// Routing-peers button group `[● status ⌄ | ⊕ Add]`: the status button opens
// a PeerSelector-style popover (search + one row per router); with no routers
// it triggers onAdd directly. Without onAdd the bar is read-only (no Add
// segment). Shared by the draft network frame's floating bar, the live
// network frames, and the live single-network header.
export const RoutingPeersBar = ({
  rows,
  count,
  onAdd,
  onPrefetch,
  onOpenChange,
  loading = false,
}: {
  rows: RoutingPeerRow[];
  count: number;
  onAdd?: () => void;
  // Fired on trigger hover — frames prefetch their rows so the popover
  // usually opens with data already there (no skeleton flash).
  onPrefetch?: () => void;
  // Fired when the popover toggles — live frames use it to lazily fetch
  // their router rows on first open (mounting a fetch per frame lagged the
  // networks overview).
  onOpenChange?: (open: boolean) => void;
  // Rows still loading (lazy live fetch) — the popover opens immediately
  // with skeleton rows instead of waiting.
  loading?: boolean;
}) => {
  const [open, setOpen] = React.useState(false);

  const [filteredRows, search, setSearch] = useSearch(
    rows,
    (row: RoutingPeerRow, query: string) =>
      row.name.toLowerCase().includes(query.toLowerCase()),
    { filter: true, debounce: 150 },
  );
  // count covers rows that haven't loaded yet (lazy live frames) — the
  // popover simply appears once they land.
  const hasRouters = rows.length > 0 || count > 0;
  // VirtualScrollAreaList keys items by `id`.
  const virtualRows = React.useMemo(
    () => filteredRows.map((row) => ({ ...row, id: row.key })),
    [filteredRows],
  );

  return (
    <div
      className={cn(
        // Fixed height matching the header's network SelectDropdown.
        "flex items-stretch h-[40px] rounded-md overflow-hidden shrink-0",
        "bg-nb-gray-920 border border-gray-700/40",
      )}
    >
      <Popover
        open={open && (rows.length > 0 || loading)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setTimeout(() => setSearch(""), 100);
          setOpen(isOpen);
          onOpenChange?.(isOpen);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type={"button"}
            onMouseEnter={onPrefetch}
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
          {filteredRows.length === 0 && search !== "" && !loading && (
            <DropdownInfoText>
              There are no routing peers matching your search.
            </DropdownInfoText>
          )}
          {loading ? (
            // While the API rows load: any already-known rows (draft
            // changeset) render as skeleton placeholders too — one per known
            // routing peer (count from the /networks payload), capped to
            // what the max height fits.
            <div
              className={"flex flex-col px-2 pb-2 pt-1 overflow-hidden"}
              style={{ maxHeight: MAX_LIST_HEIGHT }}
            >
              {Array.from({
                length: Math.min(Math.max(count, rows.length, 1), 5),
              }).map((_, i) => (
                <Skeleton
                  key={i}
                  height={30}
                  className={"rounded-md !my-[2px]"}
                />
              ))}
            </div>
          ) : (
            <VirtualScrollAreaList
              items={virtualRows}
              itemKey={(row) => row.key}
              // Tighter gap below the search input (default pt-2 read as a
              // dead strip; the network selector sits closer).
              scrollAreaClassName={"!pt-1"}
              maxHeight={MAX_LIST_HEIGHT}
              // Measured row: py-2 (16) + one text line (~17) ≈ 33px — 38
              // left a visible dead strip below the last row.
              estimatedItemHeight={34}
              // pt-1 (4) + last row pb-2 (8) on top of the rows themselves.
              heightAdjustment={4}
              onSelect={(row) => {
                if (!row.onEdit) return;
                setOpen(false);
                row.onEdit();
              }}
              itemClassNameWithItem={(row) =>
                cn(
                  "text-sm text-nb-gray-300",
                  row.onEdit ? "cursor-pointer" : "cursor-default",
                  !row.enabled && "opacity-50",
                )
              }
              renderItem={(row) => (
                <div className={"flex items-center gap-2.5 w-full min-w-0"}>
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
                        "shrink-0 text-nb-gray-400",
                        "opacity-0 group-hover/list-item:opacity-100 group-hover/list-item:text-white transition-opacity",
                      )}
                    />
                  )}
                </div>
              )}
            />
          )}
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
