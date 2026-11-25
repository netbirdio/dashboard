import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { NameDescriptionStrut } from "@components/ui/NameDescriptionStrut";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
  /** Shows the hover state while the row is hovered, for rows that open the resource on click. */
  inClickableRow?: boolean;
  /** Insets the cell like the name cell of the Networks table, for full-page tables. */
  inset?: boolean;
  /** Truncate name and description at the available width instead of a fixed length. */
  fluid?: boolean;
};

export default function ResourceNameCell({
  resource,
  inClickableRow = false,
  inset = false,
  fluid = false,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { network, openResourceModal } = useNetworksContext();

  return (
    <button
      className={cn(
        "flex gap-4 items-center group",
        inset && "py-2 pl-2 pr-4",
        fluid && "min-w-0 max-w-full",
      )}
      onClick={() => {
        if (!network || !permission.networks.update) return;
        openResourceModal(network, resource);
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md h-[38px] w-[38px] shrink-0 bg-nb-gray-900 transition-all",
          "group-hover:bg-nb-gray-800",
          inClickableRow && "group-hover/table-row:bg-nb-gray-800",
        )}
      >
        {resource.type === "host" && <WorkflowIcon size={15} />}
        {resource.type === "domain" && <GlobeIcon size={15} />}
        {resource.type === "subnet" && <NetworkIcon size={15} />}
      </div>
      <NameDescriptionStrut className={"-ml-4"} />
      <div
        className={cn(
          "flex flex-col gap-0 text-nb-gray-300 dark:text-neutral-300  font-light truncate",
          fluid && "min-w-0",
          "group-hover:text-nb-gray-100 dark:group-hover:text-neutral-100 text-left",
          inClickableRow &&
            "group-hover/table-row:text-nb-gray-100 dark:group-hover/table-row:text-neutral-100",
        )}
      >
        <TextWithTooltip
          text={resource.name}
          maxChars={25}
          fluid={fluid}
          className={"font-normal"}
        />
        <DescriptionWithTooltip
          maxChars={25}
          fluid={fluid}
          className={cn("font-normal")}
          text={resource.description}
        />
      </div>
    </button>
  );
}
