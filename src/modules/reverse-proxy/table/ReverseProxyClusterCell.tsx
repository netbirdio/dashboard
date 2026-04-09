"use client";

import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { AlertTriangle, Globe, Server } from "lucide-react";
import React from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import {
  ReverseProxy,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import FullTooltip from "@components/FullTooltip";
import { isNetBirdHosted } from "@/utils/netbird";
import InlineLink from "@components/InlineLink";

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyClusterCell({
  reverseProxy,
}: Readonly<Props>) {
  const { domains } = useReverseProxies();

  const hasCluster = !!reverseProxy.proxy_cluster;
  const isConnected = domains?.some(
    (d) =>
      d.type === ReverseProxyDomainType.FREE &&
      d.domain === reverseProxy.proxy_cluster,
  );

  if (!hasCluster) {
    return (
      <div className="flex items-center gap-2" data-cluster-cell>
        <Badge variant="gray" className="font-normal">
          <Globe size={12} />
          All
        </Badge>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2" data-cluster-cell>
        <Badge variant={"gray"} className={cn("font-normal")}>
          <Server size={11} className={cn("text-green-500")} />
          {reverseProxy.proxy_cluster}
        </Badge>
      </div>
    );
  }

  return (
    <FullTooltip
      content={
        isNetBirdHosted() ? (
          <div className={"text-xs max-w-xs"}>
            Cluster {reverseProxy.proxy_cluster} is offline. Please try again in
            a few minutes. If the issue persists, check{" "}
            <InlineLink href={"https://status.netbird.io/"} target={"_blank"}>
              NetBird Status
            </InlineLink>{" "}
            or reach out to{"  "}
            <InlineLink href={"mailto:support@netbird.io"}>
              support@netbird.io
            </InlineLink>
          </div>
        ) : (
          <div className={"flex flex-col gap-1 text-xs max-w-xs"}>
            Cluster {reverseProxy.proxy_cluster} is offline. Make sure the proxy
            server is running and connected to the right management address.
          </div>
        )
      }
      align={"center"}
      alignOffset={0}
    >
      <div className="flex items-center gap-2" data-cluster-cell>
        <Badge variant={"red"} className={cn("font-normal")}>
          <AlertTriangle size={11} />
          {reverseProxy.proxy_cluster}
        </Badge>
      </div>
    </FullTooltip>
  );
}
