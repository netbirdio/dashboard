import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  ArrowLeftIcon,
  CircleMinusIcon,
  CirclePlusIcon,
  LayoutGridIcon,
  MoreVerticalIcon,
  NetworkIcon,
  SquarePenIcon,
  Trash2Icon,
  WaypointsIcon,
  XIcon,
} from "lucide-react";
import { sortBy } from "lodash";
import React from "react";
import { useReactFlow } from "@xyflow/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { isInputFocused } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useDestinationGroup } from "@/modules/control-center/ControlCenterContext";
import {
  isDraftNetworkNode,
  isFrameNode,
  useStructuralNodes,
} from "@/modules/control-center/utils/helpers";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
import { RoutingPeersBar } from "@/modules/control-center/RoutingPeersBar";
import { useFrameRouterRows } from "@/modules/control-center/hooks/useFrameRouterRows";
import { DraftModeSwitcher } from "@/modules/control-center/draft/DraftModeSwitcher";
import { CanvasToolbar } from "@/modules/control-center/draft/CanvasToolbar";
import { useCanvasState, useControlCenterUI } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCloseOnCanvasClick } from "@/modules/control-center/hooks/useCloseOnCanvasClick";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDeleteNetwork } from "@/modules/control-center/hooks/useDeleteNetwork";

// Width for the network selector: sized to its LONGEST option label
// (~6.5px/char at the trigger's text-xs medium, plus icon/chevron/padding
// chrome), clamped to the old fixed width (256px) as the max — short network
// names don't need the full column.
const networkSelectorWidth = (labels: unknown[]) => {
  const longest = labels.reduce<number>(
    (m, l) => Math.max(m, typeof l === "string" ? l.length : 0),
    0,
  );
  return Math.min(256, Math.max(150, 86 + longest * 6.5));
};

// Network actions (⋮) next to the network selector, in BOTH modes. Edit and
// Delete are mode-aware: draft records to the changeset (deploys later), live
// hits the API immediately. Delete on an existing network confirms + deletes;
// on a draft-created one it's Remove (cancels the pending create). onDeleted
// lets the caller leave the just-deleted network's view (drill-down or
// selection). Rendered as a right-hand segment on the selector so
// [ selector | ⋮ ] reads as one control.
function NetworkActionsMenu({
  networkNodeId,
  onDeleted,
}: {
  networkNodeId: string;
  onDeleted?: () => void;
}) {
  const { setNetworkEditor } = useDraftMode();
  const reactFlow = useReactFlow();
  const { removeNodeWithEdges } = useDraftGroupActions();
  const deleteNetwork = useDeleteNetwork();

  const isDraftNew = isDraftNetworkNode(
    reactFlow.getNodes().find((n) => n.id === networkNodeId),
  );

  const handleDelete = React.useCallback(async () => {
    // Draft-created network → Remove (canvas-only, never confirms); existing
    // one → Delete (confirm + changeset delete). Only leave the view once it's
    // actually gone (deleteNetwork resolves false on cancel).
    const removed = isDraftNew
      ? (removeNodeWithEdges(networkNodeId), true)
      : await deleteNetwork(networkNodeId);
    if (removed) onDeleted?.();
  }, [isDraftNew, networkNodeId, removeNodeWithEdges, deleteNetwork, onDeleted]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type={"button"}
          aria-label={"Network actions"}
          className={
            "flex items-center justify-center h-[40px] px-4 shrink-0 rounded-r-md border border-l-0 border-gray-700/40 bg-nb-gray-920 text-gray-400 hover:text-white hover:bg-nb-gray-910 transition-colors"
          }
        >
          <MoreVerticalIcon size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={"start"} className={"w-[180px]"}>
        <DropdownMenuItem onClick={() => setNetworkEditor({ networkNodeId })}>
          <div className={"flex gap-3 items-center"}>
            <SquarePenIcon size={14} className={"shrink-0"} />
            Edit
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} variant={"danger"}>
          <div className={"flex gap-3 items-center"}>
            {isDraftNew ? (
              <CircleMinusIcon size={14} className={"shrink-0"} />
            ) : (
              <Trash2Icon size={14} className={"shrink-0"} />
            )}
            {isDraftNew ? "Remove" : "Delete"}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// "Add Resource" button for the drilled single-network top bar — sits after
// the routing-peers bar. Opens the resource editor targeting this network
// (draft: the row is created into the frame on save; live: a real POST). Styled
// to match the RoutingPeersBar pill next to it so the bar reads as one control
// language.
function AddResourceButton({ networkNodeId }: { networkNodeId: string }) {
  const { setResourceEditor } = useDraftMode();
  return (
    <button
      type={"button"}
      data-testid={"cc-add-resource"}
      onClick={() =>
        setResourceEditor({ createInNetworkNodeId: networkNodeId })
      }
      className={cn(
        "flex items-center gap-1.5 h-[40px] px-3.5 shrink-0 rounded-md text-xs whitespace-nowrap outline-none",
        "bg-nb-gray-920 border border-gray-700/40 text-gray-400",
        "hover:text-white hover:bg-nb-gray-910 transition-colors",
      )}
    >
      <CirclePlusIcon size={14} className={"shrink-0"} />
      Add Resource
    </button>
  );
}

// The drilled single-network header (draft), mirroring the live one: back
// arrow, network selector (switches which frame is drilled), the shared
// RoutingPeersBar, and Add Resource.
function DraftDrillDownHeader() {
  const { drillDownNetworkNodeId, setDrillDownNetworkNodeId, setRoutingPeerModal } =
    useDraftMode();
  const { nodes, currentView } = useCanvasState();
  const { rows, count } = useFrameRouterRows(
    drillDownNetworkNodeId ?? undefined,
    !!drillDownNetworkNodeId,
  );

  // Controlled so a canvas click closes it — the dropdown floats over the
  // ReactFlow pane, whose stopPropagation hides the click from Radix's own
  // outside-detection (same as the live selector).
  const [selectOpen, setSelectOpen] = React.useState(false);
  useCloseOnCanvasClick(selectOpen, () => setSelectOpen(false));

  // Overview (not drilled): a network selector stays top-left, like the live
  // networks view — it lists the frames on the canvas and picking one drills
  // into it (the drill effect plays the dive transition itself).
  const frameOptions = React.useMemo(() => {
    const options: SelectOption[] = sortBy(
      nodes
        .filter((n) => isFrameNode(n))
        .map((n) => ({
          value: n.id,
          label:
            (n.data as { network?: { name?: string } })?.network?.name ??
            "Network",
          icon: NetworkIcon,
        })),
      "label",
    );
    // Mirrors the live selector: "All Networks" (value "") is the overview.
    options.unshift({
      value: "",
      label: "All Networks",
      icon: () => <LayoutGridIcon size={14} />,
    } as SelectOption);
    return options;
  }, [nodes]);

  const drilled = !!drillDownNetworkNodeId;

  // The all-networks OVERVIEW selector only belongs to draft sessions ENTERED
  // from the networks view — picking a network from the top-left list is a
  // networks-view concept. Entering from peers/users/groups leaves currentView
  // on that view (the live FlowSelector is hidden in draft, so it can't
  // change), so the standalone selector must stay hidden even after the user
  // adds a network frame to the canvas. The DRILL-DOWN header (back button,
  // network switcher, routing-peers bar) is view-agnostic, so it still renders
  // once the user drills into a network from any entry view.
  if (!drilled && currentView !== FlowView.NETWORKS) return null;

  // Overview with no frames on the canvas → nothing to select.
  if (!drilled && frameOptions.length <= 1) return null;

  return (
    <>
      {/* Back to the all-networks overview (only while drilled in). */}
      {drilled && (
        <Button
          variant={"secondary"}
          size={"xs"}
          className={"!bg-nb-gray-930"}
          data-testid={"cc-drill-back"}
          onClick={() => setDrillDownNetworkNodeId(null)}
        >
          <ArrowLeftIcon size={14} />
        </Button>
      )}
      {/* Network SELECTOR (+ attached ✎ edit segment when drilled) — one
          control. The selector switches the drill-down between the frames
          ("All Networks" = overview). */}
      <div className={"flex items-stretch"}>
        <div
          key={"draft-network-select"}
          className={"min-w-[200px]"}
          style={{ width: networkSelectorWidth(frameOptions.map((o) => o.label)) }}
        >
          <SelectDropdown
            variant={"secondary"}
            deferChange
            value={drillDownNetworkNodeId ?? ""}
            onChange={(nodeId) => setDrillDownNetworkNodeId(nodeId || null)}
            options={frameOptions}
            showSearch={true}
            open={selectOpen}
            onOpenChange={setSelectOpen}
            popoverMinWidth={200}
            className={cn(
              // Same treatment as the live network selector.
              "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300 !pr-3 !h-[40px] !py-0",
              // Square the right corners so the ✎ segment attaches flush.
              drilled && "!rounded-r-none",
            )}
            size={"xs"}
          />
        </div>
        {drilled && (
          <NetworkActionsMenu
            networkNodeId={drillDownNetworkNodeId}
            onDeleted={() => setDrillDownNetworkNodeId(null)}
          />
        )}
      </div>
      {/* Routing peers and resources only make sense on a specific network.
          Add Resource sits right after the routing-peers bar. */}
      {drilled && (
        <RoutingPeersBar
          rows={rows}
          count={count}
          onAdd={() =>
            setRoutingPeerModal({ networkNodeId: drillDownNetworkNodeId })
          }
        />
      )}
      {drilled && <AddResourceButton networkNodeId={drillDownNetworkNodeId} />}
    </>
  );
}

function HeaderTopLeft() {
  const { currentView, selectedNetwork } = useCanvasState();
  const { isDraft } = useDraftMode();
  const {
    networkOptions,
    currentNetwork,
    onViewChange,
    onNetworkSelect,
  } = useControlCenterUI();
  const { networks } = useControlCenterData();
  const hasNetworks = (networks?.length ?? 0) > 0;

  // Controlled so a click on the canvas closes it (the dropdown floats over
  // the ReactFlow pane, whose stopPropagation hides the click from Radix's own
  // outside-detection — see the hook).
  const [networkSelectOpen, setNetworkSelectOpen] = React.useState(false);
  useCloseOnCanvasClick(networkSelectOpen, () => setNetworkSelectOpen(false));

  return (
    <div className={"absolute left-0 top-0 z-10"}>
      <div
        className={
          "flex justify-between px-6 py-4 text-sm w-full"
        }
      >
        {/* Keys keep each control's identity stable while its conditional
            siblings mount/unmount — without them, picking a network inserts
            the back button and React REMOUNTS the network SelectDropdown
            (its just-closing popover flashes). */}
        <div className={"flex gap-4"}>
          {!isDraft && selectedNetwork !== "" && (
            <Button
              key={"network-back"}
              variant={"secondary"}
              size={"xs"}
              className={"!bg-nb-gray-930"}
              data-testid={"cc-network-back"}
              onClick={() => onNetworkSelect("")}
            >
              <ArrowLeftIcon size={14} />
            </Button>
          )}

          {selectedNetwork === "" && !isDraft && (
            <FlowSelector value={currentView} onChange={onViewChange} />
          )}

          {/* Draft: the drill-down breadcrumb is the only top-left
              control — exiting draft happens via Cancel / Review & Deploy
              in the DraftModeSwitcher. */}
          {isDraft && <DraftDrillDownHeader />}

          {/* Draft title (Untitled Draft dropdown + three-dots menu) hidden for now */}
          {/* {isDraft && <DraftModeTitle />} */}

          {/* Network SELECTOR (+ attached ✎ edit segment once a network is
              drilled into) — one control, mirroring the draft header. The edit
              opens the real network modal (PUT) for the existing network. */}
          {!isDraft && currentView === "networks" && hasNetworks && (
            <div key={"network-select"} className={"flex items-stretch"}>
              <div
                className={"min-w-[200px]"}
                style={{
                  width: networkSelectorWidth(networkOptions.map((o) => o.label)),
                }}
              >
                <SelectDropdown
                  variant={"secondary"}
                  deferChange
                  value={selectedNetwork}
                  onChange={onNetworkSelect}
                  options={networkOptions}
                  showSearch={true}
                  open={networkSelectOpen}
                  onOpenChange={setNetworkSelectOpen}
                  popoverMinWidth={200}
                  className={cn(
                    // Fixed height matching the RoutingPeersBar next to it.
                    "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300 !pr-3 !h-[40px] !py-0",
                    // Square the right corners so the ✎ segment attaches flush.
                    selectedNetwork && "!rounded-r-none",
                  )}
                  size={"xs"}
                />
              </div>
              {selectedNetwork && (
                <NetworkActionsMenu
                  networkNodeId={`network-${selectedNetwork}`}
                  onDeleted={() => onNetworkSelect("")}
                />
              )}
            </div>
          )}

          {!isDraft && selectedNetwork && currentNetwork && (
            <NetworkRoutingPeerCount
              key={"network-routing-peers"}
              network={currentNetwork}
            />
          )}

          {!isDraft && selectedNetwork && currentNetwork && (
            <AddResourceButton
              key={"network-add-resource"}
              networkNodeId={`network-${selectedNetwork}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Top-center pill naming the active mode — armed it prompts for a node,
// focused it names the target; the X exits.
function FocusModePill() {
  const { highlightArmed, setHighlightArmed, focusedNodeId, setFocusedNodeId } =
    useDestinationGroup();
  const nodes = useStructuralNodes();
  const show = highlightArmed || focusedNodeId !== "";

  // "F" arms/exits the mode, Escape exits (pane clicks intentionally don't).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && show && !e.defaultPrevented) {
        setHighlightArmed(false);
        setFocusedNodeId("");
        return;
      }
      if (e.key.toLowerCase() !== "f") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isInputFocused()) return;
      e.preventDefault();
      if (show) {
        setHighlightArmed(false);
        setFocusedNodeId("");
      } else {
        setHighlightArmed(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [show, setHighlightArmed, setFocusedNodeId]);

  // Name of whatever is focused — peer, resource, group, policy or network.
  const focusedName = React.useMemo(() => {
    if (!focusedNodeId) return "";
    const data = nodes.find((n) => n.id === focusedNodeId)?.data as
      | {
          peer?: { name?: string };
          resource?: { name?: string };
          group?: { name?: string };
          policy?: { name?: string };
          network?: { name?: string };
        }
      | undefined;
    return (
      data?.peer?.name ??
      data?.resource?.name ??
      data?.group?.name ??
      data?.policy?.name ??
      data?.network?.name ??
      ""
    );
  }, [nodes, focusedNodeId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={"absolute top-0 left-1/2 z-10"}
          initial={{ x: "-50%", y: -40, opacity: 0 }}
          animate={{ x: "-50%", y: 0, opacity: 1 }}
          exit={{ x: "-50%", y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          <div className={"py-4"}>
            {/* Same surface as the Live/Draft switcher. */}
            <div
              className={
                "flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full border border-nb-gray-900 bg-nb-gray-930 text-xs font-medium text-nb-gray-200"
              }
            >
              <WaypointsIcon size={13} className={"text-sky-400 shrink-0"} />
              {focusedNodeId
                ? `Highlighting connections for “${focusedName || "node"}”`
                : "Select a node to highlight its connections"}
              <button
                onClick={() => {
                  setHighlightArmed(false);
                  setFocusedNodeId("");
                }}
                className={
                  "p-1.5 rounded-full text-nb-gray-400 hover:text-nb-gray-100 hover:bg-nb-gray-800 transition-colors"
                }
                aria-label={"Exit Highlight Mode"}
              >
                <XIcon size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeaderTopRight() {
  return (
    <div className={"absolute right-0 top-0 z-10"}>
      <div className={"px-6 py-4 flex items-center gap-3"}>
        <DraftModeSwitcher />
      </div>
    </div>
  );
}

function HeaderBottom() {
  const { isDraft } = useDraftMode();

  // Always visible in draft (slides in/out with draft via framer-motion).
  const showToolbar = isDraft;

  return (
    <AnimatePresence>
      {showToolbar && (
        <motion.div
          className={"absolute bottom-0 left-1/2 z-10"}
          initial={{ x: "-50%", y: 80, opacity: 0 }}
          animate={{ x: "-50%", y: 0, opacity: 1 }}
          exit={{ x: "-50%", y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          <div className={"py-4"}>
            <CanvasToolbar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ControlCenterHeader() {
  return (
    <>
      <HeaderTopLeft />
      <HeaderTopRight />
      <FocusModePill />
      <HeaderBottom />
    </>
  );
}
