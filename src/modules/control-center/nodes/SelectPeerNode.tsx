import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import { sortBy } from "lodash";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import { OSLogo } from "@/modules/peers/PeerOSCell";

type PeerNodeProps = Node<
  {
    currentPeer: string;
    onPeerChange: (peerId: string) => void;
  },
  "selectPeerNode"
>;

export const SelectPeerNode = ({ data, id }: PeerNodeProps) => {
  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");

  const peerSelectOptions: SelectOption[] = sortBy(
    peers?.map(
      (p) =>
        ({
          value: p.id,
          label: p.name,
          icon: () => {
            const os = p.os as unknown as OperatingSystem;
            return (
              <div
                className={cn(
                  "flex items-center justify-center grayscale brightness-[100%] contrast-[40%]",
                  "w-4 h-4 shrink-0",
                  os === OperatingSystem.WINDOWS && "p-[2.5px]",
                  os === OperatingSystem.APPLE && "p-[2.7px]",
                  os === OperatingSystem.FREEBSD && "p-[1.5px]",
                )}
              >
                <OSLogo os={p.os} />
              </div>
            );
          },
        }) as SelectOption,
    ) || [],
    "label",
    "asc",
  );

  const peer = peers?.find((p) => p.id === data.currentPeer);

  return (
    <div
      className={
        "bg-nb-gray-930 border hover:bg-nb-gray-910 cursor-pointer border-nb-gray-800 rounded-lg overflow-hidden transition-all"
      }
    >
      <SelectDropdown
        variant={"secondary"}
        value={data.currentPeer}
        onChange={data.onPeerChange}
        options={peerSelectOptions}
        showSearch={true}
        searchPlaceholder={"Search peers..."}
        popoverWidth={280}
        className={"!bg-nb-gray-920  !hover:bg-nb-gray-925 !text-nb-gray-300"}
        size={"xs"}
        maxHeight={300}
      >
        <div className={"flex items-center justify-between gap-8 pr-3"}>
          {peer && <DeviceCard device={peer} />}
          <ChevronsUpDown size={18} className={"shrink-0"} />
        </div>
      </SelectDropdown>
      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        style={{
          height: 20,
          width: "1px",
          border: "none",
          backgroundColor: "#3f444b",
          borderRadius: "0px 4px 4px 0px",
          right: -2,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={"tl"}
        className={"opacity-0"}
      />
    </div>
  );
};
