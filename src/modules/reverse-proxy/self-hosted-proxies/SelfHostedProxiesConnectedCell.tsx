import Badge from "@components/Badge";
import { Server } from "lucide-react";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";

type Props = {
  cluster: ReverseProxyCluster;
};

export default function SelfHostedProxiesConnectedCell({
  cluster,
}: Readonly<Props>) {
  const count = cluster.connected_proxies;
  return (
    <div className="flex items-center w-full">
      <Badge variant={"gray"}>
        <Server size={11} className={"relative -top-[0.5px]"} />
        <div>
          <span className="font-medium text-xs">
            {count > 0 ? count : "No Proxies Connected"}
          </span>
        </div>
      </Badge>
    </div>
  );
}
