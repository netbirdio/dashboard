import { IconDirectionSign } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { type Node } from "@xyflow/react";
import * as React from "react";
import { useIsContextMenuTarget } from "@/modules/control-center/contexts/ControlCenterContext";
import { AllHandles } from "@/modules/control-center/handles/AllHandles";
import type { ExitNodeNodeData } from "@/modules/control-center/hooks/views/types";
import ExitNodeLocations from "@/modules/exit-nodes/ExitNodeLocations";

type ExitNodeNodeProps = Node<ExitNodeNodeData, "exitNodeNode">;

/**
 * The destination of an exit-node policy: where the policy's sources send
 * their internet traffic, with the countries it exits in.
 */
export const ExitNodeNode = ({ id, data }: ExitNodeNodeProps) => {
  const showHalo = useIsContextMenuTarget(id);

  return (
    <div
      className={cn(
        "relative rounded-lg transition-all group/node cursor-pointer",
        "border bg-nb-gray-940 border-nb-gray-850 min-h-[64px] flex items-center pr-5 pl-3 py-2.5",
        "hover:bg-nb-gray-930 hover:border-nb-gray-800",
        showHalo && "ring-2 ring-sky-500",
        !data.enabled && "opacity-60",
      )}
      data-testid={"cc-exit-node"}
    >
      <div className={"flex items-center gap-2.5 text-nb-gray-300"}>
        <div
          className={cn(
            "h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 transition-all",
            "border border-nb-gray-850 group-hover/node:bg-nb-gray-800 group-hover/node:border-nb-gray-700",
          )}
        >
          <IconDirectionSign size={16} className={"text-yellow-400"} />
        </div>
        <div className={"flex flex-col gap-1 justify-center leading-tight"}>
          <span
            className={
              "font-normal text-[0.85rem] text-nb-gray-100 flex items-center gap-1.5"
            }
          >
            <span className={"truncate max-w-[160px]"}>{data.name}</span>
            {!data.enabled && (
              <span className={"text-nb-gray-500 text-xs"}>Disabled</span>
            )}
          </span>
          <ExitNodeDetails data={data} />
        </div>
      </div>
      <AllHandles />
    </div>
  );
};

const ExitNodeDetails = ({ data }: { data: ExitNodeNodeData }) => {
  if (data.missing)
    return (
      <span className={"text-sm text-nb-gray-500"}>Unknown exit node</span>
    );
  return (
    <span className={"flex items-center gap-2 text-sm text-nb-gray-500"}>
      {/* The flags' tooltip lists every city; keep the click on the card. */}
      <ExitNodeLocations
        countries={data.countries}
        locations={data.locations}
      />
      <span className={"whitespace-nowrap"}>
        {data.activePeerCount === data.peerCount
          ? `${data.peerCount} ${data.peerCount === 1 ? "peer" : "peers"}`
          : `${data.activePeerCount} of ${data.peerCount} peers active`}
      </span>
    </span>
  );
};
