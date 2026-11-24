import { stopRowClick } from "@components/table/stopRowClick";
import { cn } from "@utils/helpers";
import { useRouter } from "next/navigation";
import { Network } from "@/interfaces/Network";
import { NetworkInformationSquare } from "@/modules/networks/misc/NetworkInformationSquare";

type Props = {
  network: Network;
  fluid?: boolean;
};
export default function NetworkNameCell({
  network,
  fluid = false,
}: Readonly<Props>) {
  const router = useRouter();

  const isActive = !!(
    network?.routing_peers_count && network.routing_peers_count > 0
  );

  return (
    <div
      className={cn(
        "flex gap-4 items-center min-w-0",
        fluid ? "w-fit max-w-full" : "min-w-[225px] max-w-[340px]",
      )}
      onClick={stopRowClick}
    >
      <NetworkInformationSquare
        name={network.name}
        active={isActive}
        onClick={() => router.push(`/network?id=${network.id}`)}
        description={network.description}
        fluid={fluid}
      />
    </div>
  );
}
