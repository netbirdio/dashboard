import { useRouter } from "next/navigation";
import { Network } from "@/interfaces/Network";
import { NetworkInformationSquare } from "@/modules/networks/misc/NetworkInformationSquare";

type Props = {
  network: Network;
};
export default function NetworkNameCell({ network }: Readonly<Props>) {
  const router = useRouter();

  const isActive = !!(
    network?.routing_peers_count && network.routing_peers_count > 0
  );

  return (
    <div className={"flex gap-4 items-center min-w-[300px] max-w-[300px]"}>
      <NetworkInformationSquare
        name={network.name}
        active={isActive}
        onClick={() => router.push(`/network?id=${network.id}`)}
        description={network.description}
      />
    </div>
  );
}
