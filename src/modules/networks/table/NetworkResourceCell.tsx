import Badge from "@components/Badge";
import Button from "@components/Button";
import { LayersIcon, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};

export const NetworkResourceCell = ({ network }: Props) => {
  const { permission } = usePermissions();

  const { openResourceModal } = useNetworksContext();
  const router = useRouter();

  const hasResources = network?.resources && network?.resources?.length > 0;
  const count = network?.resources?.length || 0;

  return hasResources ? (
    <div className={"flex gap-3"}>
      <Badge
        variant={"gray"}
        useHover={true}
        className={"cursor-pointer"}
        onClick={() => router.push(`/network?id=${network.id}`)}
      >
        <LayersIcon size={14} />
        <div>
          <span className={"font-medium text-xs"}>{count}</span>
        </div>
      </Badge>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"min-w-[130px]"}
        onClick={() => openResourceModal(network)}
        disabled={!permission.networks.update}
      >
        <PlusCircle size={12} />
        Add Resource
      </Button>
    </div>
  ) : (
    <>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"min-w-[130px]"}
        onClick={() => openResourceModal(network)}
      >
        <PlusCircle size={12} />
        Add Resource
      </Button>
    </>
  );
};
