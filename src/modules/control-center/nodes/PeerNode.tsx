import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import TruncatedText from "@components/ui/TruncatedText";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { type Node, Position, useConnection } from "@xyflow/react";
import { sortBy } from "lodash";
import {
  BotIcon,
  ChevronsUpDown,
  DownloadIcon,
  MonitorSmartphoneIcon,
  ServerIcon,
} from "lucide-react";
import * as React from "react";
import type { Peer } from "@/interfaces/Peer";
import { useAccount } from "@/modules/account/useAccount";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  getIpPlaceholderFromRange,
  PLACEHOLDER_BASE_NAMES,
  useAnySourceGroupEnabled,
} from "@/modules/control-center/utils/helpers";
import { ConnectHandle } from "@/modules/control-center/handles/ConnectHandle";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { usePlaceholderUpgrade } from "@/modules/control-center/hooks/useDraftPeerUpgrade";
import { PeerOperatingSystemIcon } from "@/modules/peers/PeerOperatingSystemIcon";

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

  if (placeholderKind === "user-device") {
    return (
      <UserDeviceSelectNode
        id={id}
        data={data}
        isTarget={isTarget}
        showHalo={showHalo}
      />
    );
  }

  if (placeholderKind) {
    const Icon = placeholderKind === "agent" ? BotIcon : ServerIcon;
    // Drops always assign a unique placeholderName ("Agent", "Agent (1)", …);
    // the fallback only covers drafts persisted before names existed.
    const label = placeholderName || PLACEHOLDER_BASE_NAMES[placeholderKind];
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
        {/* Floating Install — top-left above the node, zooms with the
            canvas (positioned inside the node, not a NodeToolbar portal). */}
        <div className={"absolute bottom-full left-0 mb-2"}>
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
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs shrink-0",
              "bg-nb-gray-920 border border-gray-700/40 text-gray-400",
              "hover:text-white hover:bg-nb-gray-910 transition-colors",
            )}
          >
            <DownloadIcon size={13} />
            Install
          </button>
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

// Draft "User Device" placeholder: a select node like the live-mode peer
// picker. Before a peer is chosen it shows "Select user device..." with a
// floating Install button (top-left, like the peers toolbar); choosing a
// peer upgrades the node in place via usePlaceholderUpgrade — edges are
// rewired and draft policies referencing it follow the selection.
const UserDeviceSelectNode = ({
  id,
  data,
  isTarget,
  showHalo,
}: {
  id: string;
  data: PeerNodeType["data"];
  isTarget: boolean;
  showHalo: boolean;
}) => {
  const { peer, placeholderName, setupKey, showHandles = true } = data;
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { nodes: canvasNodes } = useCanvasState();
  const { setInstallModal } = useDraftMode();
  const upgrade = usePlaceholderUpgrade();

  const label = placeholderName || PLACEHOLDER_BASE_NAMES["user-device"];

  // Peers already on the canvas can't be picked twice — except the one this
  // node currently shows.
  const options: SelectOption[] = React.useMemo(
    () =>
      sortBy(
        (peers ?? [])
          .filter(
            (p) =>
              p.id === peer?.id ||
              !canvasNodes.some((n) => n.id === `peer-${p.id}`),
          )
          .map(
            (p) =>
              ({
                value: p.id,
                label: p.name,
                icon: () => <PeerOperatingSystemIcon os={p.os} />,
              }) as SelectOption,
          ),
        ["label", "value"],
      ),
    [peers, canvasNodes, peer],
  );

  const onPeerChange = (peerId: string) => {
    const selected = peers?.find((p) => p.id === peerId);
    if (!selected?.id || selected.id === peer?.id) return;
    upgrade([{ nodeId: id, peer: selected }]);
  };

  return (
    <div
      className={cn(
        "relative rounded-lg transition-all group/node border bg-nb-gray-940 border-nb-gray-900",
        "hover:bg-nb-gray-930 hover:border-nb-gray-800 cursor-pointer",
        isTarget && "hover:bg-nb-gray-930 hover:ring-2 ring-white",
        showHalo && "ring-2 ring-sky-500",
      )}
    >
      {/* Floating Install — top-left above the node, like the peers toolbar.
          Positioned inside the node (not a NodeToolbar portal) so it zooms
          with the canvas. Hidden once a peer is selected (the device already
          exists). */}
      {!peer && (
        <div className={"absolute bottom-full left-0 mb-2"}>
          <button
            onClick={() =>
              setInstallModal({
                isUserDevice: true,
                setupKey,
                placeholderKind: "user-device",
                nodeId: id,
              })
            }
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs shrink-0",
              "bg-nb-gray-920 border border-gray-700/40 text-gray-400",
              "hover:text-white hover:bg-nb-gray-910 transition-colors",
            )}
          >
            <DownloadIcon size={13} />
            Install
          </button>
        </div>
      )}

      <SelectDropdown
        variant={"secondary"}
        value={peer?.id ?? ""}
        onChange={onPeerChange}
        options={options}
        showSearch={true}
        searchPlaceholder={"Search peers..."}
        popoverWidth={280}
        className={"!bg-transparent !text-nb-gray-300 rounded-lg"}
        size={"xs"}
        maxHeight={300}
      >
        <div className={"flex items-center justify-between gap-6 pr-3"}>
          {peer ? (
            <DeviceCard device={peer} />
          ) : (
            <div className={"flex items-center gap-2.5 pl-3 py-1 text-left"}>
              <div
                className={
                  "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-300 group-hover/node:bg-nb-gray-800 transition-all"
                }
              >
                <MonitorSmartphoneIcon size={16} />
              </div>
              <div className={"flex flex-col gap-0 justify-center leading-tight"}>
                <span
                  className={
                    "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-2 mb-1.5 mt-2"
                  }
                >
                  <TruncatedText text={label} maxWidth={"150px"} hideTooltip />
                </span>
                <span
                  className={
                    "font-normal text-sm text-nb-gray-500 relative -top-[0.3rem]"
                  }
                >
                  Select user device...
                </span>
              </div>
            </div>
          )}
          <ChevronsUpDown size={18} className={"shrink-0 text-nb-gray-400"} />
        </div>
      </SelectDropdown>

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
