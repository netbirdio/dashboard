import { HelpTooltip } from "@components/HelpTooltip";
import { Input } from "@components/Input";
import { cn } from "@utils/helpers";
import { isHostInCIDR, isValidCIDR, isValidIP, parseCIDR } from "@utils/ip";
import React, { useMemo } from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ReverseProxyTargetType } from "@/interfaces/ReverseProxy";
import type { Target } from "@/modules/reverse-proxy/targets/ReverseProxyTargetSelector";

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
    if (!isValidCIDR(resourceAddress)) return false;
    const parts = resourceAddress.split("/");
    if (parts.length !== 2) return false;
    const mask = parseInt(parts[1], 10);
    const hostMask = resourceAddress.includes(":") ? 128 : 32;
    return mask < hostMask;
  }, [target?.type, resourceAddress]);

  const cidrInfo = useMemo(() => {
    if (!resourceAddress) return null;
    if (!isValidCIDR(resourceAddress)) return null;
    return parseCIDR(resourceAddress);
  }, [resourceAddress]);

  // Cluster targets carry an operator-supplied upstream as host, dialed
  // directly via the host network stack (direct_upstream is implied).
  const isHostEditable =
    isCidrRange || target?.type === ReverseProxyTargetType.CLUSTER;

  const isHostInCidrRange = useMemo(() => {
    if (!cidrInfo || !target?.host) return false;
    if (!isValidIP(target.host)) return false;
    return isHostInCIDR(target.host, cidrInfo);
  }, [cidrInfo, target?.host]);

  const isValidCidrHost =
    !isCidrRange || (!!target?.host && !!cidrInfo && isHostInCidrRange);

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
  const t = useTranslations();
  const { cidrInfo, resourceAddress } = useReverseProxyAddress(target);
  if (!cidrInfo) return null;
  return (
    <HelpTooltip
      content={t("reverseProxy.targetCidrAddressHelp", {
        range: resourceAddress,
      })}
    />
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
  const t = useTranslations();
  const { isHostEditable } = useReverseProxyAddress(target);

  // Cluster targets accept hostnames or IPs; CIDR-mode targets are
  // restricted to numeric/dot characters because the value must fall
  // inside a known IPv4 range.
  const restrictToIPv4 =
    isHostEditable && target?.type !== ReverseProxyTargetType.CLUSTER;

  const placeholder =
    target?.type === ReverseProxyTargetType.CLUSTER
      ? t("reverseProxy.eG127001OrBackendLan")
      : t("reverseProxy.eG192168010");

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
