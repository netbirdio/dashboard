import Badge from "@components/Badge";
import Button from "@components/Button";
import { PlusCircle, ShieldIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  network: Network;
};

export const NetworkPolicyCell = ({ network }: Props) => {
  const { permission } = usePermissions();

  const { openPolicyModal } = useNetworksContext();
  const router = useRouter();

  const hasPolicies = network?.policies && network?.policies?.length > 0;
  const count = network?.policies?.length || 0;

  return hasPolicies ? (
    <div className={"flex gap-3"}>
      <Badge
        variant={"gray"}
        useHover={true}
        className={"cursor-pointer"}
        onClick={() => router.push(`/network?id=${network.id}`)}
      >
        <ShieldIcon size={14} className={"text-green-500"} />
        <div>
          <span className={"font-medium text-xs"}>{count}</span>
        </div>
      </Badge>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"min-w-[130px]"}
        onClick={() => openPolicyModal(network)}
        disabled={!permission.networks.update}
      >
        <PlusCircle size={12} />
        Add Policy
      </Button>
    </div>
  ) : (
    <>
      <Button
        size={"xs"}
        variant={"secondary"}
        className={"min-w-[130px]"}
        onClick={() => openPolicyModal(network)}
      >
        <PlusCircle size={12} />
        Add Policy
      </Button>
    </>
  );
};
