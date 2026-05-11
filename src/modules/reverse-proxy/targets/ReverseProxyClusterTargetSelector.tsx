"use client";

import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { ServerIcon } from "lucide-react";
import React, { useMemo } from "react";
import {
  ReverseProxyDomainType,
  ReverseProxyTargetType,
} from "@/interfaces/ReverseProxy";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import type { Target } from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";

type Props = {
  value?: Target;
  onChange: (value: Target | undefined) => void;
};

export default function ReverseProxyClusterTargetSelector({
  value,
  onChange,
}: Readonly<Props>) {
  const { domains } = useReverseProxies();

  const clusterOptions: SelectOption[] = useMemo(() => {
    return (
      domains
        ?.filter((d) => d.type === ReverseProxyDomainType.FREE)
        .map((d) => ({
          value: d.domain,
          label: d.domain,
          icon: ServerIcon,
        })) ?? []
    );
  }, [domains]);

  const selected =
    value?.type === ReverseProxyTargetType.CLUSTER ? value.resourceId ?? "" : "";

  return (
    <div>
      <Label>Proxy Cluster</Label>
      <HelpText>
        Inbound traffic terminates on this cluster&apos;s proxy peer in your
        account. Configure the upstream the proxy reverse-proxies to below —
        it is dialed directly via the host network stack.
      </HelpText>
      <SelectDropdown
        value={selected}
        onChange={(clusterAddr) => {
          if (!clusterAddr) {
            onChange(undefined);
            return;
          }
          onChange({
            type: ReverseProxyTargetType.CLUSTER,
            resourceId: clusterAddr,
            host: value?.host ?? "",
          });
        }}
        options={clusterOptions}
        placeholder={
          clusterOptions.length === 0
            ? "No proxy clusters available"
            : "Select a proxy cluster"
        }
        showSearch={clusterOptions.length > 5}
        disabled={clusterOptions.length === 0}
      />
    </div>
  );
}
