import Badge from "@components/Badge";
import { Server } from "lucide-react";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";

type Props = {
  cluster: ReverseProxyCluster;
};

export default function ClustersConnectedCell({ cluster }: Readonly<Props>) {
  const count = cluster.connected_proxies;
  return (
    <div className={"flex"}>
      <Badge variant={"gray"}>
        <Server size={11} />
        <div>
          <span className={"font-medium text-xs"}>{count}</span>
        </div>
      </Badge>
    </div>
  );
}
