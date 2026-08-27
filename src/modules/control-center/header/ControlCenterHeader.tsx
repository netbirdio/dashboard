import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { cn } from "@utils/helpers";
import { useReactFlow } from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import { sortBy } from "lodash";
import {
  ArrowLeftIcon,
  CircleMinusIcon,
  CirclePlusIcon,
  FocusIcon,
  LayoutGridIcon,
  MessageSquareShare,
  MoreVerticalIcon,
  NetworkIcon,
  SquarePenIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useDestinationGroup } from "@/modules/control-center/contexts/ControlCenterContext";
import {
  useCanvasState,
  useControlCenterUI,
} from "@/modules/control-center/contexts/ControlCenterContext";
import { CanvasToolbar } from "@/modules/control-center/draft/CanvasToolbar";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { DraftModeSwitcher } from "@/modules/control-center/draft/DraftModeSwitcher";
import {
  FlowSelector,
  FlowView,
} from "@/modules/control-center/header/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/header/NetworkRoutingPeerCount";
import { useCloseOnCanvasClick } from "@/modules/control-center/hooks/useCloseOnCanvasClick";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { isInputFocused } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useDeleteNetwork } from "@/modules/control-center/hooks/useDeleteNetwork";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import { useFrameRouterRows } from "@/modules/control-center/hooks/useFrameRouterRows";
import { RoutingPeersBar } from "@/modules/control-center/panels/RoutingPeersBar";
import {
  isDraftNetworkNode,
  isFrameNode,
  useStructuralNodes,
} from "@/modules/control-center/utils/helpers";

// Sized to the longest option label (~6.5px/char at text-xs), clamped to 256px.
const networkSelectorWidth = (labels: unknown[]) => {
  const longest = labels.reduce<number>(
    (m, l) => Math.max(m, typeof l === "string" ? l.length : 0),
    0,
  );
  return Math.min(256, Math.max(150, 86 + longest * 6.5));
};

function NetworkActionsMenu({
  networkNodeId,
  onDeleted,
}: {
  networkNodeId: string;
  onDeleted?: () => void;
}) {
  const { isDraft, setNetworkEditor } = useDraftMode();
  const { permission } = usePermissions();
  const reactFlow = useReactFlow();
  const { removeNodeWithEdges } = useDraftGroupActions();
  const deleteNetwork = useDeleteNetwork();

  const isDraftNew = isDraftNetworkNode(
    reactFlow.getNodes().find((n) => n.id === networkNodeId),
  );

  // Live actions hit the API directly and follow the node menu's gates; draft
  // ones only queue changes, which the deploy pre-flight re-checks.
  const mayEdit = isDraft || permission.networks.update;
  const mayDelete = isDraft || permission.networks.delete;

  const handleDelete = React.useCallback(async () => {
    // deleteNetwork resolves false when the confirmation is cancelled.
    const removed = isDraftNew
      ? (removeNodeWithEdges(networkNodeId), true)
      : await deleteNetwork(networkNodeId);
    if (removed) onDeleted?.();
  }, [
    isDraftNew,
    networkNodeId,
    removeNodeWithEdges,
    deleteNetwork,
    onDeleted,
  ]);

  if (!mayEdit && !mayDelete) return null;

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
        {mayEdit && (
          <DropdownMenuItem
            onClick={() => setNetworkEditor({ networkNodeId })}
          >
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit
            </div>
          </DropdownMenuItem>
        )}
        {mayEdit && mayDelete && <DropdownMenuSeparator />}
        {mayDelete && (
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
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

function DraftDrillDownHeader() {
  const {
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
    setRoutingPeerModal,
  } = useDraftMode();
  const { nodes, currentView } = useCanvasState();
  const { rows, count } = useFrameRouterRows(
    drillDownNetworkNodeId ?? undefined,
    !!drillDownNetworkNodeId,
  );

  // Controlled because the ReactFlow pane's stopPropagation hides canvas
  // clicks from Radix's own outside-detection.
  const [selectOpen, setSelectOpen] = React.useState(false);
  useCloseOnCanvasClick(selectOpen, () => setSelectOpen(false));

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
    options.unshift({
      value: "",
      label: "All Networks",
      icon: () => <LayoutGridIcon size={14} />,
    } as SelectOption);
    return options;
  }, [nodes]);

  const drilled = !!drillDownNetworkNodeId;

  // The overview selector belongs only to networks-view drafts; the
  // drill-down header itself is view-agnostic.
  if (!drilled && currentView !== FlowView.NETWORKS) return null;

  if (!drilled && frameOptions.length <= 1) return null;

  return (
    <>
      <div className={"flex min-w-0 max-w-full gap-3 md:gap-4"}>
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
        <div className={"flex min-w-0 items-stretch"}>
          <div
            key={"draft-network-select"}
            className={"min-w-[120px] md:min-w-[200px]"}
            style={{
              width: networkSelectorWidth(frameOptions.map((o) => o.label)),
            }}
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
      </div>
      {drilled && (
        <div className={"flex flex-wrap gap-3 md:gap-4"}>
          <RoutingPeersBar
            rows={rows}
            count={count}
            onAdd={() =>
              setRoutingPeerModal({ networkNodeId: drillDownNetworkNodeId })
            }
          />
          <AddResourceButton networkNodeId={drillDownNetworkNodeId} />
        </div>
      )}
    </>
  );
}

function HeaderTopLeft() {
  const { currentView, selectedNetwork } = useCanvasState();
  const { isDraft } = useDraftMode();
  const { networkOptions, currentNetwork, onViewChange, onNetworkSelect } =
    useControlCenterUI();
  const { networks } = useControlCenterData();
  const { permission } = usePermissions();
  const hasNetworks = (networks?.length ?? 0) > 0;
  // Live-only header: the ⋯ menu self-hides on missing permissions, and the
  // select's squared corner must follow it.
  const showNetworkActions =
    permission.networks.update || permission.networks.delete;

  // Controlled because the ReactFlow pane's stopPropagation hides canvas
  // clicks from Radix's own outside-detection.
  const [networkSelectOpen, setNetworkSelectOpen] = React.useState(false);
  useCloseOnCanvasClick(networkSelectOpen, () => setNetworkSelectOpen(false));

  return (
    <div className={"pointer-events-auto min-w-0 text-sm"}>
      {/* Keys keep each control's identity stable as conditional siblings
          mount, so picking a network doesn't remount the SelectDropdown. */}
      <div className={"flex flex-wrap gap-3 md:gap-4"}>
        {!isDraft && (
          <div className={"flex flex-wrap min-w-0 max-w-full gap-3 md:gap-4"}>
            {selectedNetwork !== "" && (
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

            {selectedNetwork === "" && (
              <FlowSelector value={currentView} onChange={onViewChange} />
            )}

            {currentView === "networks" && hasNetworks && (
              <div
                key={"network-select"}
                className={"flex min-w-0 items-stretch"}
              >
                <div
                  className={"min-w-[120px] md:min-w-[200px]"}
                  style={{
                    width: networkSelectorWidth(
                      networkOptions.map((o) => o.label),
                    ),
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
                      selectedNetwork && showNetworkActions && "!rounded-r-none",
                    )}
                    size={"xs"}
                  />
                </div>
                {selectedNetwork && showNetworkActions && (
                  <NetworkActionsMenu
                    networkNodeId={`network-${selectedNetwork}`}
                    onDeleted={() => onNetworkSelect("")}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {isDraft && <DraftDrillDownHeader />}

        {!isDraft && selectedNetwork && currentNetwork && (
          <div className={"flex flex-wrap gap-3 md:gap-4"}>
            <NetworkRoutingPeerCount
              key={"network-routing-peers"}
              network={currentNetwork}
            />
            {permission.networks.update && (
              <AddResourceButton
                key={"network-add-resource"}
                networkNodeId={`network-${selectedNetwork}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FocusModePill() {
  const { highlightArmed, setHighlightArmed, focusedNodeId, setFocusedNodeId } =
    useDestinationGroup();
  const nodes = useStructuralNodes();
  const show = highlightArmed || focusedNodeId !== "";

  // "F" arms/exits, Escape exits; pane clicks intentionally don't.
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
            <div
              className={
                "flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full border border-nb-gray-900 bg-nb-gray-930 text-xs font-medium text-nb-gray-200"
              }
            >
              <FocusIcon size={13} className={"text-sky-400 shrink-0"} />
              {focusedNodeId
                ? `Focusing on “${focusedName || "node"}”`
                : "Select a node to focus"}
              <button
                onClick={() => {
                  setHighlightArmed(false);
                  setFocusedNodeId("");
                }}
                className={
                  "p-1.5 rounded-full text-nb-gray-400 hover:text-nb-gray-100 hover:bg-nb-gray-800 transition-colors"
                }
                aria-label={"Exit Focus"}
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
    <div className={"ml-auto shrink-0 pointer-events-auto"}>
      <div className={"flex items-center gap-3"}>
        <DraftModeSwitcher />
      </div>
    </div>
  );
}

function HeaderBottom() {
  const { isDraft } = useDraftMode();

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

function FeedbackButton() {
  return (
    <div className={"absolute bottom-0 right-0 z-10 p-3 md:px-6 md:py-4"}>
      <a
        href={"https://forms.gle/WURodsLqdsoRrgKHA"}
        target={"_blank"}
        rel={"noopener noreferrer"}
      >
        <Button variant={"secondary"} size={"xs"} className={"h-[39px] px-4.5"}>
          <MessageSquareShare size={14} />
          Feedback
        </Button>
      </a>
    </div>
  );
}

export function ControlCenterHeader() {
  return (
    <>
      <div
        className={
          "absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 md:gap-4 p-3 md:px-6 md:py-4 pointer-events-none"
        }
      >
        <HeaderTopLeft />
        <HeaderTopRight />
      </div>
      <FocusModePill />
      <HeaderBottom />
      <FeedbackButton />
    </>
  );
}
