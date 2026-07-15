import TruncatedText from "@components/ui/TruncatedText";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import { BotIcon, DownloadIcon, ServerIcon } from "lucide-react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import { useAccount } from "@/modules/account/useAccount";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  getIpPlaceholderFromRange,
  useAnySourceGroupEnabled,
} from "@/modules/control-center/utils/helpers";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

// A not-yet-installed peer dropped from the components sidebar. No setup key
// exists until the user installs: the Install button opens the setup modal,
// where the key is generated on demand and then held here (`setupKey`) so a
// later reopen reuses it.
export type PeerPlaceholderKind = "server" | "agent";

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
    // registering peer against it (useDraftPeerUpgrade).
    installHostname?: string;
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
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const { contextMenuNodeId } = useCanvasState();
  const { setInstallModal } = useDraftMode();
  const account = useAccount();
  const showHalo = contextMenuNodeId === id;

  if (placeholderKind) {
    const Icon = placeholderKind === "agent" ? BotIcon : ServerIcon;
    // Drops always assign a unique placeholderName ("Agent", "Agent (1)", …);
    // the fallback only covers drafts persisted before names existed.
    const label =
      placeholderName || (placeholderKind === "agent" ? "Agent" : "Server");
    // Mirrors the real peer node (card variant + default-size DeviceCard):
    // same wrapper padding, icon box, gaps and text sizes — only the Install
    // button is extra.
    return (
      <div
        className={cn(
          "relative rounded-lg transition-all group/node border bg-nb-gray-940 border-nb-gray-900",
          "hover:bg-nb-gray-930 hover:border-nb-gray-800 pr-5 pl-3 py-1",
          isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
          showHalo && "ring-2 ring-sky-500",
        )}
      >
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
                "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1.5 mt-2"
              }
            >
              <TruncatedText text={label} maxWidth={"150px"} hideTooltip />
            </span>
            {/* Sits in the slot where real peers show their NetBird IP —
                x placeholders read as "assigned on install", derived from
                the account's peer network range. */}
            <span
              className={
                "font-normal text-sm text-nb-gray-500 relative -top-[0.3rem]"
              }
            >
              {getIpPlaceholderFromRange(account?.settings?.network_range)}
            </span>
          </div>
          <button
            onClick={() =>
              setInstallModal({
                isUserDevice: false,
                setupKey,
                placeholderKind,
                nodeId: id,
              })
            }
            className={cn(
              "ml-2 flex items-center gap-1.5 rounded-md bg-netbird px-2.5 py-1.5 text-xs text-white",
              "hover:bg-netbird-500 transition-colors shrink-0",
            )}
          >
            <DownloadIcon size={13} />
            Install
          </button>
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
        "relative rounded-lg transition-all group/node pr-5 pl-3 py-1 border",
        variant === "card" &&
          "bg-nb-gray-940 border-nb-gray-900 hover:bg-nb-gray-930 hover:border-nb-gray-800",
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
      {showHandles && (
        <>
          <AllHandles />
          <ConnectHandle type={"source"} position={Position.Left} />
          <ConnectHandle type={"source"} position={Position.Right} />
        </>
      )}
    </div>
  );
};
