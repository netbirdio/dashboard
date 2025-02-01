import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
};

export default function ResourceNameCell({ resource }: Readonly<Props>) {
  const { network, openResourceModal } = useNetworksContext();

  return (
    <button
      className={"flex gap-4 items-center group"}
      onClick={() => {
        if (!network) return;
        openResourceModal(network, resource);
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-9 w-9 shrink-0 bg-nb-gray-900 transition-all",
          "group-hover:bg-nb-gray-800",
        )}
      >
        {resource.type === "host" && <WorkflowIcon size={15} />}
        {resource.type === "domain" && <GlobeIcon size={15} />}
        {resource.type === "subnet" && <NetworkIcon size={15} />}
      </div>
      <div
        className={cn(
          "flex flex-col gap-0 text-neutral-300  font-light truncate",
          "group-hover:text-neutral-100 text-left",
        )}
      >
        <TextWithTooltip
          text={resource.name}
          maxChars={25}
          className={"font-normal"}
        />
        <DescriptionWithTooltip
          maxChars={25}
          className={cn("font-normal mt-0.5 ")}
          text={resource.description}
        />
      </div>
    </button>
  );
}
