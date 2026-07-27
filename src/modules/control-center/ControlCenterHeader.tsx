import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { AnimatePresence, motion } from "framer-motion";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  ArrowLeftIcon,
  LayoutGridIcon,
  NetworkIcon,
  PencilLineIcon,
  SquareDashedMousePointerIcon,
  XIcon,
} from "lucide-react";
import { sortBy } from "lodash";
import React from "react";
import { isInputFocused } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useDestinationGroup } from "@/modules/control-center/ControlCenterContext";
import {
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

// Shown while a network frame is drilled into (single-network draft view),
// mirroring the live single-network header 1:1: back arrow, the network
// SELECT (switches the drill-down between the frames on the canvas), the
// shared RoutingPeersBar (rows from the draft state; Add opens the
// routing-peer modal, the draft counterpart of the live navigation to the
// routing-peers tab), plus a draft-only edit button (networks page's network
// modal in pure-data mode — name + description land on the draft network).
function DraftDrillDownHeader() {
  const {
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
    setRoutingPeerModal,
    setNetworkEditor,
  } = useDraftMode();
  const { nodes } = useCanvasState();
  const { rows, count } = useFrameRouterRows(
    drillDownNetworkNodeId ?? undefined,
    !!drillDownNetworkNodeId,
  );

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

  if (!drillDownNetworkNodeId) {
    if (frameOptions.length <= 1) return null;
    return (
      <div
        key={"draft-network-select"}
        style={{ width: networkSelectorWidth(frameOptions.map((o) => o.label)) }}
      >
        <SelectDropdown
          variant={"secondary"}
          value={""}
          onChange={(nodeId) => nodeId && setDrillDownNetworkNodeId(nodeId)}
          options={frameOptions}
          showSearch={true}
          className={
            // Same treatment as the live network selector.
            "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300 !pr-3 !h-[40px] !py-0"
          }
          size={"xs"}
        />
      </div>
    );
  }
  const frame = nodes.find((n) => n.id === drillDownNetworkNodeId);
  const name =
    (frame?.data as { network?: { name?: string } })?.network?.name ?? "";

  return (
    <>
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"!bg-nb-gray-930"}
        onClick={() => setDrillDownNetworkNodeId(null)}
      >
        <ArrowLeftIcon size={14} />
      </Button>
      {/* Network name chip, same button-group treatment as RoutingPeersBar:
          [icon name | ✎] — the pencil segment (draft networks only) opens
          the network editor. Not a select: the drill-down targets one frame. */}
      <div
        className={
          "flex items-stretch h-[40px] rounded-md overflow-hidden shrink-0 bg-nb-gray-920 border border-gray-700/40"
        }
      >
        <div
          className={
            // Same left padding (px-4), icon-text gap (2.5) and label
            // typography (xs medium, nb-gray-200) as the live network
            // SelectDropdown trigger.
            "flex items-center gap-2.5 pl-4 pr-4 text-xs font-medium text-nb-gray-200 whitespace-nowrap"
          }
        >
          {/* Same icon size + color as the network SelectDropdown trigger
              (its icon inherits the button's nb-gray-300). */}
          <NetworkIcon size={14} className={"shrink-0 text-nb-gray-300"} />
          {name}
        </div>
        {/* Edit segment (like the routing bar's Add): draft networks edit
            the draft (pure-data), existing ones open the REAL network modal
            (its save PUTs). */}
        <button
          type={"button"}
          aria-label={"Edit network"}
          onClick={() =>
            setNetworkEditor({ networkNodeId: drillDownNetworkNodeId })
          }
          className={
            "flex items-center px-4 outline-none border-l border-gray-700/40 text-gray-400 hover:text-white hover:bg-nb-gray-910 transition-colors"
          }
        >
          <PencilLineIcon size={12} />
        </button>
      </div>
      <RoutingPeersBar
        rows={rows}
        count={count}
        onAdd={() =>
          setRoutingPeerModal({ networkNodeId: drillDownNetworkNodeId })
        }
      />
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

          {!isDraft && currentView === "networks" && hasNetworks && (
            <div
              key={"network-select"}
              style={{
                width: networkSelectorWidth(networkOptions.map((o) => o.label)),
              }}
            >
              <SelectDropdown
                variant={"secondary"}
                value={selectedNetwork}
                onChange={onNetworkSelect}
                options={networkOptions}
                showSearch={true}
                className={
                  // Fixed height matching the RoutingPeersBar next to it.
                  "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300 !pr-3 !h-[40px] !py-0"
                }
                size={"xs"}
              />
            </div>
          )}

          {!isDraft && selectedNetwork && currentNetwork && (
            <NetworkRoutingPeerCount
              key={"network-routing-peers"}
              network={currentNetwork}
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
              <SquareDashedMousePointerIcon
                size={13}
                className={"text-sky-400 shrink-0"}
              />
              {focusedNodeId
                ? `Focusing “${focusedName || "node"}”`
                : "Select a node to highlight its connections"}
              <button
                onClick={() => {
                  setHighlightArmed(false);
                  setFocusedNodeId("");
                }}
                className={
                  "p-1.5 rounded-full text-nb-gray-400 hover:text-nb-gray-100 hover:bg-nb-gray-800 transition-colors"
                }
                aria-label={"Exit Focus Mode"}
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
