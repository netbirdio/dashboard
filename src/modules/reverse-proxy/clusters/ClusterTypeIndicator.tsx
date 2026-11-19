import FullTooltip from "@components/FullTooltip";
import { ServerIcon, UserCog } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  ReverseProxyCluster,
  ReverseProxyClusterType,
} from "@/interfaces/ReverseProxy";

type Props = {
  cluster: ReverseProxyCluster;
};

// ClusterTypeIndicator renders a small icon next to the cluster name —
// same pattern as EphemeralPeerIndicator — so the source of the
// cluster is visible at a glance without a dedicated column.
export const ClusterTypeIndicator = ({ cluster }: Props) => {
  const t = useTranslations();
  // TODO(NET-1722): label a NetBird-managed gateway "Managed by NetBird"; it
  // is an account cluster but not self-hosted.
  if (cluster.type === ReverseProxyClusterType.ACCOUNT) {
    return (
      <FullTooltip
        content={
          <div className={"text-xs max-w-xs"}>
            <span className={"font-medium text-nb-gray-100 dark:text-white"}>
              {t("reverseProxy.accountCluster")}
            </span>{" "}
            {t(
              "reverseProxy.selfHostedOnYourOwnInfrastructureYouOperateTheProxyNodesAnd",
            )}
          </div>
        }
      >
        <UserCog size={12} className={"shrink-0 text-netbird"} />
      </FullTooltip>
    );
  }
  return (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          <span className={"font-medium text-nb-gray-100 dark:text-white"}>
            {t("reverseProxy.sharedCluster")}
          </span>{" "}
          {t(
            "reverseProxy.deployedAtTheServerLevelAndAvailableToEveryAccountOnThis",
          )}
        </div>
      }
    >
      <ServerIcon size={12} className={"shrink-0 text-nb-gray-300"} />
    </FullTooltip>
  );
};
