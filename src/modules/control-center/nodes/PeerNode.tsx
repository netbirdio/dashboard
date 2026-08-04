import { SmallBadge } from "@components/ui/SmallBadge";
import TruncatedText from "@components/ui/TruncatedText";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import {
  AlertTriangleIcon,
  BotIcon,
  DownloadIcon,
  MonitorSmartphoneIcon,
  ServerIcon,
} from "lucide-react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import {
  useCanvasUI,
  useDestinationGroup,
} from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  PLACEHOLDER_BASE_NAMES,
  useAnySourceGroupEnabled,
} from "@/modules/control-center/utils/helpers";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import Button from "@components/Button";

// A not-yet-installed peer dropped from the components sidebar. Server/Agent
// carry no setup key until the user installs: the Install button opens the
// setup modal, where the key is generated on demand and then held here
// (`setupKey`) so a later reopen reuses it. "user-device" renders as a
// select node — pick an existing peer from the dropdown or install a new one
// via the floating Install button.
export type PeerPlaceholderKind = "server" | "agent" | "user-device";

export type PeerNodeType = Node<
  {
    peer?: Peer;
    enabled?: boolean;
    onClick?: (p: Peer) => void;
    showHandles?: boolean;
    variant?: "default" | "card";
    placeholderKind?: PeerPlaceholderKind;
    // Canvas-only custom name set via the node context menu's Rename.
    placeholderName?: string;
    setupKey?: string;
    // Hostname the install modal suggested — the upgrade watcher matches the
    // registering peer against it (useDraftPeerUpgrade), as a fallback to the
    // bound-group match below.
    installHostname?: string;
    // Set for Server/Agent placeholders once the setup key is generated: the
    // id of a hidden, throwaway group the key auto-assigns. The upgrade watcher
    // matches the registering peer by membership in it, then deletes it.
    boundGroupId?: string;
    // Id of the setup key generated for this placeholder — deleted along with
    // the bound group once the peer is matched or the draft is abandoned.
    setupKeyId?: string;
  },
  "peerNode"
>;

export const PeerNode = ({ data, id }: PeerNodeType) => {
  const {
    peer,
    enabled,
    onClick,
    showHandles = true,
    variant = "default",
    placeholderKind,
    placeholderName,
    setupKey,
  } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(
    id,
    enabled !== undefined,
  );
  const isEnabled = enabled ?? sourceGroupEnabled;
  const isTarget = useConnection(
    (c) => c.inProgress && c.fromNode.id !== id,
  );
  const { contextMenuNodeId, placeholderIp } = useCanvasUI();
  const { selectedPeerPanel } = useDestinationGroup();
  const { setInstallModal, setUserDeviceModal } = useDraftMode();
  // Ring while the context menu targets this peer or while its groups panel
  // is open — same halo the group panel puts on its group node. Placeholder
  // peers have no data.peer.id: they're keyed on the node id (matching how
  // onNodeClick/getPlaceholderPeer derive the panel id), so fall back to that
  // or the ring never shows when a placeholder's panel is selected.
  const showHalo =
    contextMenuNodeId === id ||
    (!!selectedPeerPanel &&
      selectedPeerPanel === (data.peer?.id ?? id.replace("peer-", "")));

  // A user-device placeholder that picked its peer IS that peer (plain card
  // below); un-picked placeholders of every kind render the placeholder card
  // — user devices get "Set up" (the install+select stepper modal) instead
  // of the inline select they used to carry.
  if (placeholderKind && !peer) {
    const Icon =
      placeholderKind === "agent"
        ? BotIcon
        : placeholderKind === "user-device"
        ? MonitorSmartphoneIcon
        : ServerIcon;
    // Drops always assign a unique placeholderName ("Agent", "Agent (1)", …);
    // the fallback only covers drafts persisted before names existed.
    const label = placeholderName || PLACEHOLDER_BASE_NAMES[placeholderKind];
    // Mirrors the real peer node (card variant + default-size DeviceCard):
    // same wrapper padding, icon box, gaps and text sizes — only the Install
    // button is extra.
    return (
      <div
        className={cn(
          "relative rounded-lg transition-all group/node border bg-nb-gray-940 border-nb-gray-850",
          // Same fixed height as real peer nodes / GroupNode (64px inner).
          "hover:bg-nb-gray-930 hover:border-nb-gray-800 pr-5 pl-3 h-[64px] flex items-center",
          isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
          showHalo && "ring-2 ring-sky-500",
        )}
      >
        {/* Floating Install — top-left above the node, zooms with the
            canvas (positioned inside the node, not a NodeToolbar portal). */}
        {/* Same alert treatment as a standalone resource's "No Network"
            control — a CTA, not a plain label: user devices open the setup
            stepper, servers/agents the install modal. */}
        <div className={"absolute bottom-full left-0 mb-3 nodrag"}>
          <Button
            variant={"secondary"}
            size={"xs"}
            data-testid={"cc-peer-install"}
            onClick={() =>
              placeholderKind === "user-device"
                ? setUserDeviceModal({ nodeId: id, name: label })
                : setInstallModal({
                    isUserDevice: false,
                    setupKey,
                    placeholderKind,
                    nodeId: id,
                  })
            }
            className={"!px-3 !text-nb-gray-300"}
          >
            {placeholderKind === "user-device" ? (
              <AlertTriangleIcon size={12} className={"text-yellow-400"} />
            ) : (
              <DownloadIcon size={12} className={"text-yellow-400"} />
            )}
            {placeholderKind === "user-device" ? "Install or assign" : "Install"}
          </Button>
        </div>
        <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
          <div
            className={
              "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 group-hover/node:bg-nb-gray-800 transition-all"
            }
          >
            <Icon size={16} />
          </div>
          <div className={"flex flex-col gap-0 justify-center leading-tight"}>
            <span
              className={
                "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1 mt-1 relative top-[0.05rem]"
              }
            >
              <TruncatedText text={label} maxWidth={"150px"} hideTooltip />
              <SmallBadge />
            </span>
            {/* Sits in the slot where real peers show their NetBird IP —
                x placeholders read as "assigned on install", derived from
                the account's peer network range. */}
            <span
              className={
                "font-normal text-sm text-nb-gray-500 relative -top-[0.1rem]"
              }
            >
              {placeholderIp}
            </span>
          </div>
        </div>
        {showHandles && (
          <>
            <AllHandles />
            <ConnectHandle type={"source"} position={Position.Left} />
            <ConnectHandle type={"source"} position={Position.Right} />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Fixed height matching GroupNode (h-9 icon + py-3.5 = 64px inner)
        // so peers, selects, and groups all line up.
        "relative rounded-lg transition-all group/node pr-5 pl-3 h-[64px] flex items-center border",
        variant === "card" &&
          "bg-nb-gray-940 border-nb-gray-850 hover:bg-nb-gray-930 hover:border-nb-gray-800",
        variant === "default" && "border-transparent",
        onClick &&
          "hover:bg-nb-gray-930 hover:border-nb-gray-800 cursor-pointer",
        isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        showHalo && "ring-2 ring-sky-500",
      )}
      onClick={() => peer && onClick?.(peer)}
    >
      <DeviceCard
        device={peer}
        className={cn("p-0", !isEnabled && "opacity-60", "w-auto")}
      />
      {/* Like GroupNode: AllHandles always render (invisible edge anchors —
          edges need them to attach); showHandles only gates the visible
          connect bubbles. */}
      <AllHandles />
      {showHandles && (
        <>
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
        </>
      )}
    </div>
  );
};
