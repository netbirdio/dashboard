import Badge from "@components/Badge";
import { ShieldIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Network } from "@/interfaces/Network";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  network: Network;
};

export const NetworkPolicyCell = ({ network }: Props) => {
  const router = useRouter();

  const hasPolicies = network?.policies && network?.policies?.length > 0;
  const count = network?.policies?.length || 0;

  if (!hasPolicies) return <EmptyRow />;

  return (
    <Badge
      variant={"gray"}
      useHover={true}
      className={"cursor-pointer w-fit"}
      onClick={() => router.push(`/network?id=${network.id}`)}
    >
      <ShieldIcon size={14} className={"text-green-500"} />
      <div>
        <span className={"font-medium text-xs"}>{count}</span>
      </div>
    </Badge>
  );
};
