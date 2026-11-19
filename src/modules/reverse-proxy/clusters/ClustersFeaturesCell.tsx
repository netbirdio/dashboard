import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { Globe,Lock, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  cluster: ReverseProxyCluster;
};

type Feature = {
  key: string;
  label: string;
  description: React.ReactNode;
  icon: React.ReactNode;
};

// ClustersFeaturesCell renders one badge per supported capability.
// Only "true" flags get a badge; nil and false are omitted (the
// backend distinguishes "unsupported" from "not yet reported" via
// nullable booleans, but visually both mean "not available here").
export default function ClustersFeaturesCell({ cluster }: Readonly<Props>) {
  const t = useTranslations();
  const features: Feature[] = [];
  if (cluster.supports_custom_ports) {
    features.push({
      key: "custom-ports",
      label: t("reverseProxy.customPorts"),
      description: t(
        "reverseProxy.clusterCanBindArbitraryTCPUDPPortsForServices",
      ),
      icon: <SlidersHorizontal size={14} className={"text-netbird"} />,
    });
  }
  if (cluster.require_subdomain) {
    features.push({
      key: "subdomain",
      label: t("reverseProxy.subdomainRequired"),
      description: t(
        "reverseProxy.servicesOnThisClusterMustUseASubdomainTheBareClusterDomain",
      ),
      icon: <Globe size={14} className={"text-nb-gray-300"} />,
    });
  }
  if (cluster.supports_crowdsec) {
    features.push({
      key: "crowdsec",
      label: "CrowdSec",
      description: t(
        "reverseProxy.clusterHasCrowdSecIPReputationConfiguredAcrossAllActiveProxies",
      ),
      icon: <ShieldAlert size={14} className={"text-green-500"} />,
    });
  }
  if (cluster.private) {
    features.push({
      key: "private",
      label: t("reverseProxy.private"),
      description: (
        <>
          {t.rich("reverseProxy.clusterPrivateHelp", {
            private: (chunks) => (
              <span className="font-medium text-nb-gray-100 dark:text-white">{chunks}</span>
            ),
            cluster: (chunks) => (
              <span className="font-medium text-nb-gray-100 dark:text-white">{chunks}</span>
            ),
          })}
        </>
      ),
      icon: <Lock size={14} className={"text-netbird"} />,
    });
  }

  if (features.length === 0) {
    return <EmptyRow />;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {features.map((f) => (
        <FullTooltip
          key={f.key}
          content={
            <div className={"text-xs max-w-xs"}>
              <div className={"font-medium text-nb-gray-100 dark:text-white"}>{f.label}</div>
              <div className={"text-nb-gray-300 mt-1"}>{f.description}</div>
            </div>
          }
        >
          <Badge variant={"gray"} className={"h-[34px] cursor-help"}>
            {f.icon}
            <span className="font-medium text-xs">{f.label}</span>
          </Badge>
        </FullTooltip>
      ))}
    </div>
  );
}
