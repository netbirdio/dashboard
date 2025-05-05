import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MoreVertical, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
};
export const ResourceActionCell = ({ resource }: Props) => {
  const { permission } = usePermissions();
  const { deleteResource, network, openResourceModal } = useNetworksContext();

  return (
    <div className={"flex justify-end"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          disabled={!permission.networks.update && !permission.networks.delete}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            disabled={
              !permission.networks.update && !permission.networks.delete
            }
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => {
              if (!network) return;
              openResourceModal(network, resource);
            }}
            disabled={!permission.networks.update}
          >
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (!network) return;
              deleteResource(network, resource);
            }}
            variant={"danger"}
            disabled={!permission.networks.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Remove
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
