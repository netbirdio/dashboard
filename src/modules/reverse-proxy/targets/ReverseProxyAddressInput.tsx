import { Input } from "@components/Input";
import React, { useMemo } from "react";
import cidr from "ip-cidr";
import type { Target } from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";
import { ReverseProxyTargetType } from "@/interfaces/ReverseProxy";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { cn } from "@utils/helpers";
import { HelpTooltip } from "@components/HelpTooltip";

export function useReverseProxyAddress(target: Target | undefined) {
  const { resources } = useReverseProxies();
  const resource = useMemo(
    () => resources?.find((r) => r.id === target?.resourceId),
    [resources, target?.resourceId],
  );
  const resourceAddress = resource?.address || "";

  const isCidrRange = useMemo(() => {
    if (target?.type === ReverseProxyTargetType.SUBNET) return true;
    if (!resourceAddress) return false;
    if (!cidr.isValidCIDR(resourceAddress)) return false;
    const parts = resourceAddress.split("/");
    if (parts.length !== 2) return false;
    const mask = parseInt(parts[1], 10);
    const hostMask = resourceAddress.includes(":") ? 128 : 32;
    return mask < hostMask;
  }, [target?.type, resourceAddress]);

  const cidrInfo = useMemo(() => {
    if (!resourceAddress) return null;
    if (!cidr.isValidCIDR(resourceAddress)) return null;
    try {
      return new cidr(resourceAddress);
    } catch {
      return null;
    }
  }, [resourceAddress]);

  // Cluster targets carry an operator-supplied upstream as host, dialed
  // directly via the host network stack (direct_upstream is implied).
  const isHostEditable =
    isCidrRange || target?.type === ReverseProxyTargetType.CLUSTER;

  const isHostInCidrRange = useMemo(() => {
    if (!cidrInfo || !target?.host) return false;
    if (!cidr.isValidAddress(target.host)) return false;
    return cidrInfo.contains(target.host);
  }, [cidrInfo, target?.host]);

  const isValidCidrHost =
    !isCidrRange ||
    (!!target?.host && !!cidrInfo && isHostInCidrRange);

  return {
    resourceAddress,
    cidrInfo,
    isCidrRange,
    isHostEditable,
    isHostInCidrRange,
    isValidCidrHost,
  };
}

export function CidrHelpText({ target }: { target: Target | undefined }) {
  const { cidrInfo, resourceAddress } = useReverseProxyAddress(target);
  if (!cidrInfo) return null;
  return (
    <HelpTooltip content={`Enter an IP address within ${resourceAddress}`} />
  );
}

type Props = {
  value: Target | undefined;
  onChange: React.Dispatch<React.SetStateAction<Target | undefined>>;
  className?: string;
  autoFocus?: boolean;
};

export default function ReverseProxyAddressInput({
  value: target,
  onChange,
  className,
  autoFocus,
}: Readonly<Props>) {
  const { isHostEditable } = useReverseProxyAddress(target);

  // Cluster targets accept hostnames or IPs; CIDR-mode targets are
  // restricted to numeric/dot characters because the value must fall
  // inside a known IPv4 range.
  const restrictToIPv4 =
    isHostEditable && target?.type !== ReverseProxyTargetType.CLUSTER;

  const placeholder =
    target?.type === ReverseProxyTargetType.CLUSTER
      ? "e.g., 127.0.0.1 or backend.lan"
      : "e.g., 192.168.0.10";

  return (
    <Input
      value={target?.host ?? ""}
      onChange={(e) => {
        const host = restrictToIPv4
          ? e.target.value.replace(/[^0-9a-fA-F.:]/g, "")
          : e.target.value;
        onChange((prev) => prev && { ...prev, host });
      }}
      maxWidthClass={"w-full"}
      customSuffix={":"}
      placeholder={placeholder}
      disabled={!target}
      readOnly={target && !isHostEditable ? true : undefined}
      className={cn("rounded-r-none border-r-0", className)}
      autoFocus={autoFocus}
    />
  );
}
