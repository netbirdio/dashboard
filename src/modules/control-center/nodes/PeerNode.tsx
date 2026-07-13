import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import { BotIcon, DownloadIcon, ServerIcon } from "lucide-react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { useAnySourceGroupEnabled } from "@/modules/control-center/utils/helpers";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

// A not-yet-installed peer dropped from the components sidebar. `setupKey` is
// the locally-held key generated when the Server/Agent template was dropped;
// the Install button opens the setup modal pre-filled with it.
export type PeerPlaceholderKind = "server" | "agent";

export type PeerNodeType = Node<
  {
    peer?: Peer;
    enabled?: boolean;
    onClick?: (p: Peer) => void;
    showHandles?: boolean;
    variant?: "default" | "card";
    placeholderKind?: PeerPlaceholderKind;
    setupKey?: string;
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
    setupKey,
  } = data;
  const sourceGroupEnabled = useAnySourceGroupEnabled(id);
  const isEnabled = enabled ?? sourceGroupEnabled;
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const { contextMenuNodeId } = useCanvasState();
  const { setInstallModal } = useDraftMode();
  const showHalo = contextMenuNodeId === id;

  if (placeholderKind) {
    const Icon = placeholderKind === "agent" ? BotIcon : ServerIcon;
    const label = placeholderKind === "agent" ? "New Agent" : "New Server";
    return (
      <div
        className={cn(
          "relative rounded-lg transition-all group/node border bg-nb-gray-940 border-nb-gray-900",
          "hover:bg-nb-gray-930 hover:border-nb-gray-800 pl-3 pr-3 py-2",
          isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
          showHalo && "ring-2 ring-sky-500",
        )}
      >
        <div className={"flex items-center gap-3"}>
          <div
            className={
              "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300"
            }
          >
            <Icon size={16} />
          </div>
          <div className={"flex flex-col leading-tight"}>
            <span className={"text-sm text-nb-gray-200"}>{label}</span>
            <span className={"text-xs text-nb-gray-400"}>Not installed</span>
          </div>
          <button
            onClick={() =>
              setInstallModal({ isUserDevice: false, setupKey })
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
