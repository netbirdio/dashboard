import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { ShieldAlert, SlidersHorizontal, Globe } from "lucide-react";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";

type Props = {
  cluster: ReverseProxyCluster;
};

type Feature = {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

// ClustersFeaturesCell renders one badge per supported capability.
// Only "true" flags get a badge; nil and false are omitted (the
// backend distinguishes "unsupported" from "not yet reported" via
// nullable booleans, but visually both mean "not available here").
export default function ClustersFeaturesCell({ cluster }: Readonly<Props>) {
  const features: Feature[] = [];
  if (cluster.supports_custom_ports) {
    features.push({
      key: "custom-ports",
      label: "Custom Ports",
      description: "Cluster can bind arbitrary TCP/UDP ports for services.",
      icon: <SlidersHorizontal size={11} className={"text-netbird"} />,
    });
  }
  if (cluster.require_subdomain) {
    features.push({
      key: "subdomain",
      label: "Subdomain Required",
      description:
        "Services on this cluster must use a subdomain — the bare cluster domain is not addressable.",
      icon: <Globe size={11} className={"text-nb-gray-300"} />,
    });
  }
  if (cluster.supports_crowdsec) {
    features.push({
      key: "crowdsec",
      label: "CrowdSec",
      description:
        "Cluster has CrowdSec IP reputation configured across all active proxies.",
      icon: <ShieldAlert size={11} className={"text-green-500"} />,
    });
  }

  if (features.length === 0) {
    return <span className={"text-nb-gray-400 text-xs"}>—</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {features.map((f) => (
        <FullTooltip
          key={f.key}
          content={
            <div className={"text-xs max-w-xs"}>
              <div className={"font-medium text-white"}>{f.label}</div>
              <div className={"text-nb-gray-300 mt-1"}>{f.description}</div>
            </div>
          }
        >
          <Badge variant={"gray"}>
            {f.icon}
            <span className="font-medium text-xs">{f.label}</span>
          </Badge>
        </FullTooltip>
      ))}
    </div>
  );
}
