import Button from "@components/Button";
import { AnimatePresence, motion } from "framer-motion";
import {
  SelectDropdown,
} from "@components/select/SelectDropdown";
import { cn } from "@utils/helpers";
import { ArrowLeftIcon, PencilLineIcon } from "lucide-react";
import React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { FlowSelector, FlowView } from "@/modules/control-center/FlowSelector";
import { NetworkRoutingPeerCount } from "@/modules/control-center/NetworkRoutingPeerCount";
import { ControlCenterCurrentUserBadge } from "@/modules/control-center/user/ControlCenterCurrentUserBadge";
import { DraftModeSwitcher } from "@/modules/control-center/draft/DraftModeSwitcher";
import { CanvasToolbar } from "@/modules/control-center/draft/CanvasToolbar";
import { useCanvasState, useControlCenterUI } from "@/modules/control-center/ControlCenterContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

// Shown while a network frame is drilled into (single-network draft view),
// mirroring the live single-network header: back arrow, the network's name
// chip with an edit button (networks page's network modal in pure-data mode
// — name + description land on the draft network), and the routing-peer
// count (from draft state; clicking it opens the routing-peer modal, the
// draft counterpart of the live navigation to the routing-peers tab).
function DraftDrillDownHeader() {
  const {
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
    setRoutingPeerModal,
    setNetworkEditor,
  } = useDraftMode();
  const { nodes } = useCanvasState();
  const { changes } = useDraftChangeset();
  if (!drillDownNetworkNodeId) return null;
  const frame = nodes.find((n) => n.id === drillDownNetworkNodeId);
  const name =
    (frame?.data as { network?: { name?: string } })?.network?.name ?? "";
  const clientId = drillDownNetworkNodeId.replace("network-", "");
  const routerCount = changes.filter(
    (c) => c.type === "create-router" && c.networkClientId === clientId,
  ).length;
  const dotColor =
    routerCount === 0
      ? "bg-nb-gray-500"
      : routerCount === 1
      ? "bg-yellow-400"
      : "bg-green-400";
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
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"!cursor-default"}
      >
        {name}
      </Button>
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"!px-2"}
        aria-label={"Edit network"}
        onClick={() =>
          setNetworkEditor({ networkNodeId: drillDownNetworkNodeId })
        }
      >
        <PencilLineIcon size={12} />
      </Button>
      <Button
        variant={"secondary"}
        size={"xs"}
        onClick={() =>
          setRoutingPeerModal({ networkNodeId: drillDownNetworkNodeId })
        }
      >
        <CircleIcon size={8} className={cn("shrink-0 block", dotColor)} />
        {routerCount} Routing Peer(s)
      </Button>
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
        <div className={"flex gap-4"}>
          {!isDraft && selectedNetwork !== "" && (
            <Button
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
            <div className={"w-64"}>
              <SelectDropdown
                variant={"secondary"}
                value={selectedNetwork}
                onChange={onNetworkSelect}
                options={networkOptions}
                showSearch={true}
                className={
                  "!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300"
                }
                size={"xs"}
              />
            </div>
          )}

          {!isDraft && selectedNetwork && currentNetwork && (
            <NetworkRoutingPeerCount network={currentNetwork} />
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
