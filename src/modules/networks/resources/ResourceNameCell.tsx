import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { cn } from "@utils/helpers";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import React from "react";
import { NetworkResource } from "@/interfaces/Network";

type Props = {
  resource: NetworkResource;
};

export default function ResourceNameCell({ resource }: Readonly<Props>) {
  return (
    <div className={"flex gap-4 items-center"}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-9 w-9 shrink-0 bg-nb-gray-900 transition-all",
        )}
      >
        {resource.type === "host" && <WorkflowIcon size={15} />}
        {resource.type === "domain" && <GlobeIcon size={15} />}
        {resource.type === "subnet" && <NetworkIcon size={15} />}
      </div>
      <div className="flex flex-col gap-0 dark:text-neutral-300 text-neutral-500 font-light truncate">
        <span className={"font-normal truncate"}>{resource.name}</span>
        <DescriptionWithTooltip
          className={cn("font-normal mt-0.5 ")}
          text={resource.description}
        />
      </div>
    </div>
  );
}
