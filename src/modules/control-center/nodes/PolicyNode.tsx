import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import { getPolicyProtocolAndPortText } from "@/modules/control-center/utils/helpers";
import { Policy } from "@/interfaces/Policy";

type PolicyNode = Node<
  {
    policy: Policy;
  },
  "policyNode"
>;

export const PolicyNode = ({ data }: PolicyNode) => {
  const rule = data.policy.rules?.[0];
  const label = getPolicyProtocolAndPortText(data.policy);
  const isActive = rule?.enabled;

  return (
    <div
      className={cn(
        "relative bg-nb-gray-940 hover:bg-nb-gray-930 cursor-pointer border border-nb-gray-800 rounded-full flex justify-between overflow-hidden",
        !isActive && "opacity-60",
      )}
    >
      <div className={"flex items-center justify-center"}>
        <div
          className={cn(
            "h-2 w-2 rounded-full ml-3 mr-2",
            isActive ? "bg-green-400" : "bg-nb-gray-400",
          )}
        ></div>
      </div>
      <div className={"pt-2.5 pb-[0.6rem] pr-3 flex gap-4 leading-none"}>
        <div
          className={
            " text-nb-gray-200 font-normal whitespace-nowrap text-[0.8rem] flex items-center justify-center w-full"
          }
        >
          <div className={"truncate max-w-[200px]"}>{rule?.name}</div>
        </div>
      </div>
      <div
        className={
          "border-l border-nb-gray-800 flex items-center text-nb-gray-300 text-[0.65rem] pl-2 pr-3 font-mono"
        }
      >
        <div>{label === "" ? "All" : label}</div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={"sr"}
        className={"opacity-0"}
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
