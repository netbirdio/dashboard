import FullTooltip from "@components/FullTooltip";
import { ServerIcon, UserCog } from "lucide-react";
import * as React from "react";
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
  if (cluster.type === ReverseProxyClusterType.ACCOUNT) {
    return (
      <FullTooltip
        content={
          <div className={"text-xs max-w-xs"}>
            <span className={"font-medium text-nb-gray-100"}>Account cluster.</span>{" "}
            Self-hosted on your own infrastructure — you operate the proxy
            nodes and control where traffic terminates.
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
          <span className={"font-medium text-nb-gray-100"}>Shared cluster.</span>{" "}
          Deployed at the server level and available to every account on this
          instance.
        </div>
      }
    >
      <ServerIcon size={12} className={"shrink-0 text-nb-gray-300"} />
    </FullTooltip>
  );
};
