import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
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
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";

export const RoutingPeersIndicator = ({
  count,
  dotSize = 8,
  className,
  zeroLabel,
}: {
  count: number;
  dotSize?: number;
  className?: string;
  zeroLabel?: string;
}) => {
  // A missing router means the network can't route, so the status bar warns
  // instead of showing the traffic-light dot.
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

export type RoutingPeerRow = {
  key: string;
  peerOs?: string;
  name: string;
  isGroup: boolean;
  peersCount?: number;
  enabled: boolean;
  // Rows without one are read-only.
  onEdit?: () => void;
};

// Counts PEERS, not routers: a group router contributes all of its peers.
export const getRoutingPeerCount = (rows: RoutingPeerRow[]) =>
  rows.reduce(
    (sum, r) => (r.enabled ? sum + (r.isGroup ? r.peersCount ?? 0 : 1) : sum),
    0,
  );

export const sortRoutingPeerRows = (rows: RoutingPeerRow[]) =>
  rows.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    if (a.isGroup !== b.isGroup) return a.isGroup ? -1 : 1;
    if (a.isGroup && b.isGroup)
      return (b.peersCount ?? 0) - (a.peersCount ?? 0);
    return a.name.localeCompare(b.name);
  });

const MAX_LIST_HEIGHT = 195;

export const RoutingPeersBar = ({
  rows,
  count,
  onAdd,
  onPrefetch,
  onOpenChange,
  loading = false,
  compact = false,
}: {
  rows: RoutingPeerRow[];
  count: number;
  onAdd: () => void;
  onPrefetch?: () => void;
  // Live frames fetch their rows on first open; a fetch per mounted frame
  // lagged the networks overview.
  onOpenChange?: (open: boolean) => void;
  loading?: boolean;
  // Frame variant: matches the height of the node's floating "Install" button.
  compact?: boolean;
}) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const { isDraft } = useDraftMode();
  const { permission } = usePermissions();
  // Live Add/row-edit hit the routers API directly, so they follow the node menu's
  // networks.update gate; draft actions only queue changes the pre-flight re-checks.
  const canManage = isDraft || permission.networks.update;

  // The ReactFlow pane stops pointerdown before it bubbles to Radix's
  // outside-dismiss, so canvas clicks only reach a capture-phase listener.
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

  // The count covers rows that haven't loaded yet (lazy live frames).
  const hasRouters = rows.length > 0 || count > 0;
  // VirtualScrollAreaList keys items by `id`.
  const virtualRows = React.useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        id: row.key,
        onEdit: canManage ? row.onEdit : undefined,
      })),
    [rows, canManage],
  );

  return (
    <div
      className={cn(
        "flex items-stretch rounded-md overflow-hidden shrink-0",
        compact ? "h-[34px]" : "h-[40px]",
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
              // With no routers this button IS the Add action; without
              // preventDefault Radix latches `open` and the popover springs out.
              if (!hasRouters) {
                e.preventDefault();
                if (canManage) onAdd();
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
            // One skeleton per known routing peer, capped to what fits.
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
              // Read-only list: nothing should look pre-hovered.
              autoSelectFirst={false}
              scrollAreaClassName={"!pt-2"}
              maxHeight={MAX_LIST_HEIGHT}
              // Must equal the real row height: the Virtuoso viewport is sized
              // from this estimate and overshooting leaves a dead strip.
              estimatedItemHeight={32}
              // The last row's own pb-2 already matches the top pt-2.
              heightAdjustment={0}
              onSelect={(row) => {
                if (!row.onEdit) return;
                setOpen(false);
                row.onEdit();
              }}
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
      {/* With no routers the status button itself adds the first. */}
      {hasRouters && canManage && (
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
