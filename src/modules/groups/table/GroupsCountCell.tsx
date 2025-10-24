import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  icon: React.ReactNode;
  count: number;
  groupName: string;
  text?: string;
};
export default function GroupsCountCell({
  icon,
  count = 0,
  groupName,
  text,
}: Props) {
  return (
    <FullTooltip
      className={"w-full"}
      content={
        <div className={"text-xs"}>
          Group <span className={"text-netbird font-medium"}>{groupName}</span>{" "}
          is used in <span className={"font-medium text-netbird"}>{count}</span>{" "}
          {text}
        </div>
      }
      disabled={count === 0}
    >
      <Badge
        variant={"gray"}
        className={cn("gap-2 w-full", count === 0 && "opacity-30")}
      >
        {icon}
        {count}
      </Badge>
    </FullTooltip>
  );
}
