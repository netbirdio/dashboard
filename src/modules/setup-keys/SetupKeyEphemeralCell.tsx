import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  ephemeral: boolean;
};
export default function SetupKeyEphemeralCell({ ephemeral }: Props) {
  return ephemeral ? (
    <FullTooltip
      interactive={false}
      content={
        <div className={"max-w-xs text-xs"}>
          Peers that are offline for over 10 minutes will be removed
          automatically.
        </div>
      }
      disabled={!ephemeral}
    >
      <Badge variant={"gray"}>
        <span
          className={cn(
            "h-2 w-2 rounded-full mr-0.5",
            ephemeral ? "bg-yellow-500" : "bg-nb-gray-400",
          )}
        ></span>
        Ephemeral
        <HelpCircle size={12} />
      </Badge>
    </FullTooltip>
  ) : (
    <EmptyRow />
  );
}
