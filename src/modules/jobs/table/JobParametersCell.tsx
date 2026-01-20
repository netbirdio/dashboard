import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { TooltipListItem } from "@components/TooltipListItem";
import { InfoIcon } from "lucide-react";
import React from "react";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

export const JobParametersCell = ({ parameters }: { parameters: any }) => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return <EmptyRow />;
  }

  const entries = Object.entries(parameters);

  return (
    <FullTooltip
      side={"top"}
      interactive={true}
      delayDuration={250}
      skipDelayDuration={100}
      contentClassName={"p-0"}
      content={
        <div
          className={"text-xs flex flex-col"}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {entries.map(([key, value]) => (
            <TooltipListItem
              label={key.replaceAll("_", " ")}
              labelClassName={"capitalize"}
              value={
                typeof value === "boolean"
                  ? value
                    ? "Yes"
                    : "No"
                  : String(value)
              }
              key={key}
            />
          ))}
        </div>
      }
    >
      <Badge
        variant="gray"
        className="flex items-center gap-1.5 cursor-default"
      >
        <InfoIcon size={12} />
        {entries.length} Parameters
      </Badge>
    </FullTooltip>
  );
};
