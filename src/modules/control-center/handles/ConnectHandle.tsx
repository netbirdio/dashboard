import * as React from "react";
import { useMemo } from "react";
import { cn } from "@utils/helpers";
import { Handle, Position, useConnection, useNodeId } from "@xyflow/react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from "lucide-react";

type Props = {
  position?: Position;
  type?: "source" | "target";
  style?: React.CSSProperties;
};

const generateHandleId = (type: "source" | "target", position: Position) => {
  const st = type === "source" ? "s" : "t";
  let p;
  switch (position) {
    case Position.Right:
      p = "r";
      break;
    case Position.Left:
      p = "l";
      break;
    case Position.Top:
      p = "t";
      break;
    case Position.Bottom:
      p = "b";
      break;
  }
  return `${st}${p}`;
};

export const ConnectHandle = ({
  position = Position.Right,
  type = "source",
  style,
}: Props) => {
  const nodeId = useNodeId();

  const handleId = useMemo(
    () => generateHandleId(type, position) + "-connect",
    [type, position],
  );

  const connection = useConnection();
  const isConnecting =
    connection.fromNode?.id === nodeId &&
    connection.fromHandle?.id === handleId;

  const ArrowIcon = {
    [Position.Right]: ArrowRightIcon,
    [Position.Left]: ArrowLeftIcon,
    [Position.Top]: ArrowUpIcon,
    [Position.Bottom]: ArrowDownIcon,
  }[position];

  const isHorizontal =
    position === Position.Left || position === Position.Right;

  return (
    (!connection.inProgress || isConnecting) && (
      <Handle
        type={type}
        position={position}
        id={handleId}
        className="group/handle"
        style={{
          background: "none",
          border: "none",
          borderRadius: "0",
          ...(isHorizontal
            ? { width: "1em", height: "4em" }
            : { width: "4em", height: "1em" }),
          ...style,
        }}
      >
        <div
          className={cn(
            "h-3.5 w-3.5 absolute -translate-x-1/2 -translate-y-1/2 transition-all flex items-center justify-center",
            isHorizontal ? "top-1/2" : "left-1/2",
            position === Position.Right && "left-[calc(50%+16px)]",
            position === Position.Left && "left-[calc(50%-16px)]",
            position === Position.Bottom && "top-[calc(50%+16px)]",
            position === Position.Top && "top-[calc(50%-16px)]",
            "opacity-0 group-hover/node:opacity-100",
            "bg-nb-gray-940 border border-nb-gray-800 rounded-full",
            "group-hover/handle:w-7 group-hover/handle:h-7 group-hover/handle:bg-white group-hover/handle:border-2 text-nb-gray",
            isConnecting && "opacity-0",
          )}
        >
          <div className="absolute inset-0 flex items-center justify-center group-hover/handle:opacity-0">
            <div className="h-2 w-2 bg-nb-gray-200 rounded-full" />
          </div>
          <ArrowIcon
            size={16}
            className={cn(
              isConnecting
                ? "opacity-100"
                : "opacity-0 group-hover/handle:opacity-100",
            )}
          />
        </div>
      </Handle>
    )
  );
};
