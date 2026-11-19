"use client";

import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { cn } from "@utils/helpers";
import { AlertTriangle, Globe, Server } from "lucide-react";
import React from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  ReverseProxy,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import { isNetBirdCloud } from "@/utils/netbird";

type Props = {
  reverseProxy: ReverseProxy;
  compact?: boolean;
};

export default function ReverseProxyClusterCell({
  reverseProxy,
  compact,
}: Readonly<Props>) {
  const t = useTranslations();
  const { domains } = useReverseProxies();

  const hasCluster = !!reverseProxy.proxy_cluster;
  const isConnected = domains?.some(
    (d) =>
      d.type === ReverseProxyDomainType.FREE &&
      d.domain === reverseProxy.proxy_cluster,
  );

  if (!hasCluster) {
    return compact ? (
      <FullTooltip
        interactive={false}
        content={
          <span className={"text-xs"}>
            <span className={"text-nb-gray-400"}>
              {t("reverseProxy.cluster")}
            </span>
            <span className={"text-nb-gray-100"}>{t("common.all")}</span>
          </span>
        }
      >
        <span
          className={"inline-flex items-center gap-1.5 truncate cursor-help"}
        >
          <Globe size={11} className={"shrink-0"} />
          {t("common.all")}
        </span>
      </FullTooltip>
    ) : (
      <div className="flex items-center gap-2" data-cluster-cell>
        <Badge variant="gray" className="font-normal">
          <Globe size={12} />
          {t("common.all")}
        </Badge>
      </div>
    );
  }

  if (isConnected) {
    return compact ? (
      <FullTooltip
        interactive={false}
        content={
          <span className={"text-xs"}>
            <span className={"text-nb-gray-400"}>
              {t("reverseProxy.cluster")}
            </span>
            <span className={"text-nb-gray-100"}>
              {reverseProxy.proxy_cluster}
            </span>
          </span>
        }
      >
        <span
          className={"inline-flex items-center gap-1.5 truncate cursor-help"}
        >
          <Server size={11} className={"shrink-0"} />
          {reverseProxy.proxy_cluster}
        </span>
      </FullTooltip>
    ) : (
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
        isNetBirdCloud() ? (
          <div className={"text-xs max-w-xs"}>
            {t.rich("reverseProxy.clusterOfflineHelp", {
              name: reverseProxy.proxy_cluster ?? "",
              status: (chunks) => (
                <InlineLink href="https://status.netbird.io/" target="_blank">
                  {chunks}
                </InlineLink>
              ),
              support: (chunks) => (
                <InlineLink href="mailto:support@netbird.io">
                  {chunks}
                </InlineLink>
              ),
            })}
          </div>
        ) : (
          <div className={"flex flex-col gap-1 text-xs max-w-xs"}>
            {t.rich("reverseProxy.selfHostedClusterOffline", {
              name: reverseProxy.proxy_cluster ?? "",
            })}
          </div>
        )
      }
      align={"center"}
      alignOffset={0}
    >
      {compact ? (
        <span
          className={
            "inline-flex items-center gap-1.5 text-red-500 cursor-help truncate"
          }
        >
          <AlertTriangle size={11} className={"shrink-0"} />
          {reverseProxy.proxy_cluster}
        </span>
      ) : (
        <div className="flex items-center gap-2" data-cluster-cell>
          <Badge variant={"red"} className={cn("font-normal")}>
            <AlertTriangle size={11} />
            {reverseProxy.proxy_cluster}
          </Badge>
        </div>
      )}
    </FullTooltip>
  );
}
