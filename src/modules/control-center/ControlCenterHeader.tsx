import Button from "@components/Button";
import { AnimatePresence, motion } from "framer-motion";
import {
  SelectDropdown,
} from "@components/select/SelectDropdown";
import { ArrowLeftIcon, NetworkIcon, PencilLineIcon } from "lucide-react";
import React from "react";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
import { RoutingPeersBar } from "@/modules/control-center/RoutingPeersBar";
import { useFrameRouterRows } from "@/modules/control-center/hooks/useFrameRouterRows";
import { ControlCenterCurrentUserBadge } from "@/modules/control-center/user/ControlCenterCurrentUserBadge";
import { DraftModeSwitcher } from "@/modules/control-center/draft/DraftModeSwitcher";
import { CanvasToolbar } from "@/modules/control-center/draft/CanvasToolbar";
import { useCanvasState, useControlCenterUI } from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

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
  if (!drillDownNetworkNodeId) return null;
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
  const { currentView, selectedNetwork, previousSelectedUser } =
    useCanvasState();
  const { isDraft } = useDraftMode();
  const {
    networkOptions,
    currentNetwork,
    onViewChange,
    onNetworkSelect,
    onForceSingleUserView,
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

          {!isDraft && previousSelectedUser !== "" && (
            <>
              <Button
                variant={"secondary"}
                size={"xs"}
                className={"!bg-nb-gray-930"}
                onClick={() => {
                  onForceSingleUserView(previousSelectedUser);
                }}
              >
                <ArrowLeftIcon size={14} />
              </Button>
              <ControlCenterCurrentUserBadge
                userId={previousSelectedUser}
              />
            </>
          )}

          {selectedNetwork === "" &&
            previousSelectedUser === "" &&
            !isDraft && (
              <FlowSelector value={currentView} onChange={onViewChange} />
            )}

          {/* Draft: the drill-down breadcrumb is the only top-left
              control — exiting draft happens via Cancel / Review & Deploy
              in the DraftModeSwitcher. */}
          {isDraft && <DraftDrillDownHeader />}

          {/* Draft title (Untitled Draft dropdown + three-dots menu) hidden for now */}
          {/* {isDraft && <DraftModeTitle />} */}

          {!isDraft && currentView === "networks" && hasNetworks && (
            <div key={"network-select"} className={"w-64"}>
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

function HeaderTopRight() {
  return (
    <div className={"absolute right-0 top-0 z-10"}>
      <div className={"px-6 py-4"}>
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
      <HeaderBottom />
    </>
  );
}
