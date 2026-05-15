import { Server } from "lucide-react";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";

type Props = {
  cluster: ReverseProxyCluster;
};

export default function ClustersConnectedCell({ cluster }: Readonly<Props>) {
  const count = cluster.connected_proxies;
  return (
    <div className="flex items-center gap-2 text-nb-gray-300">
      <Server size={12} className={"shrink-0"} />
      <span className="font-medium tabular-nums">{count}</span>
    </div>
  );
}
