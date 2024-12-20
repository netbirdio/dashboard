import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { EyeIcon, MoreVertical, PencilLineIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Network } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};
export default function NetworkActionCell({ network }: Props) {
  const { deleteNetwork, openEditNetworkModal } = useNetworksContext();
  const router = useRouter();

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => router.push(`/network?id=${network.id}`)}
          >
            <div className={"flex gap-3 items-center"}>
              <EyeIcon size={14} className={"shrink-0"} />
              View Details
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEditNetworkModal(network)}>
            <div className={"flex gap-3 items-center"}>
              <PencilLineIcon size={14} className={"shrink-0"} />
              Rename
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => deleteNetwork(network)}
            variant={"danger"}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
