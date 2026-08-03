import { cn, singularize } from "@utils/helpers";
import {
  AlertTriangleIcon,
  ChevronDown,
  CirclePlusIcon,
  SquarePenIcon,
} from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import CircleIcon from "@/assets/icons/CircleIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
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
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Dismiss on any outside pointerdown — including clicks on the ReactFlow
  // canvas. Radix's built-in outside-dismiss listens on the bubbling phase,
  // but the canvas pane stops pointerdown propagation before it reaches the
  // document, so canvas clicks never dismiss it. A capture-phase listener runs
  // top-down before the pane handler, so it always fires — matching how the
  // other canvas dropdowns close on a pane click.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as (Node & Element) | null;
      if (!target) return;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // count covers rows that haven't loaded yet (lazy live frames) — the
  // popover simply appears once they land.
  const hasRouters = rows.length > 0 || count > 0;
  // VirtualScrollAreaList keys items by `id`.
  const virtualRows = React.useMemo(
    () => rows.map((row) => ({ ...row, id: row.key })),
    [rows],
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
          setOpen(isOpen);
          onOpenChange?.(isOpen);
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type={"button"}
            onMouseEnter={onPrefetch}
            onClick={(e) => {
              e.stopPropagation();
              // Empty state: this button IS the Add action, not a popover
              // toggle. preventDefault stops Radix's composed trigger handler
              // from flipping `open` to true — otherwise it latches open behind
              // the suppressed (rows === 0) popover and springs open the moment
              // the just-added routing peer becomes a row.
              if (!hasRouters) {
                e.preventDefault();
                onAdd?.();
              }
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
            {hasRouters && (
              <ChevronDown size={14} className={"shrink-0 text-nb-gray-400"} />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          hideWhenDetached={false}
          className={"w-[300px] p-0 shadow-sm shadow-nb-gray-950"}
          align={"start"}
          side={"bottom"}
          sideOffset={8}
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            // While the API rows load: any already-known rows (draft
            // changeset) render as skeleton placeholders too — one per known
            // routing peer (count from the /networks payload), capped to
            // what the max height fits.
            <div
              className={"flex flex-col px-2 pb-2 pt-2 overflow-hidden"}
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
              // Read-only list, not a keyboard-select combobox — don't
              // pre-highlight the first row on open (only real hover should).
              autoSelectFirst={false}
              scrollAreaClassName={"!pt-2"}
              maxHeight={MAX_LIST_HEIGHT}
              // Measured row: py-2 (16) + one text line (~17) ≈ 33px — 38
              // left a visible dead strip below the last row.
              estimatedItemHeight={34}
              // Bottom padding is the last row's pb-2 (8) alone — match the
              // top pt-2 (8). No extra container fudge (it was adding ~4px more
              // below the last row than above the first).
              heightAdjustment={0}
              onSelect={(row) => {
                if (!row.onEdit) return;
                setOpen(false);
                row.onEdit();
              }}
              // Match the header's network SelectDropdown option rows: text-xs
              // font-medium, py-1 px-2, and the same nb-gray-910 hover.
              itemClassNameWithItem={(row) =>
                cn(
                  "text-xs font-medium text-nb-gray-200 py-1 px-2 dark:aria-selected:bg-nb-gray-910",
                  row.onEdit ? "cursor-pointer" : "cursor-default",
                  !row.enabled && "opacity-50",
                )
              }
              renderItem={(row) => (
                <div
                  className={"flex items-center gap-2.5 p-1 w-full min-w-0"}
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
