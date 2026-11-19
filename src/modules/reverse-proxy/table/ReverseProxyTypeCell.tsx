import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { ArrowRightFromLineIcon, GlobeIcon, LockKeyhole } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ReverseProxy, ServiceMode } from "@/interfaces/ReverseProxy";

type Props = {
  reverseProxy?: ReverseProxy;
  compact?: boolean;
};

export const ReverseProxyTypeCell = ({ reverseProxy, compact }: Props) => {
  const t = useTranslations();
  const serviceModeLabel = useMemo(() => {
    if (!reverseProxy?.mode) return "HTTPS";
    return reverseProxy.mode === ServiceMode.TLS
      ? t("reverseProxy.tLSPassthrough")
      : reverseProxy.mode.toUpperCase();
  }, [reverseProxy, t]);

  if (compact) {
    return <span className={"truncate"}>{serviceModeLabel}</span>;
  }

  return (
    <div className={"flex"}>
      <Badge variant={"gray"} className={"font-normal"}>
        {serviceModeLabel}
      </Badge>
    </div>
  );
};

type ReverseProxyServiceIconProps = {
  reverseProxy?: ReverseProxy;
  className?: string;
  size?: number;
};

export const ReverseProxyServiceIcon = ({
  reverseProxy,
  className,
  size = 14,
}: ReverseProxyServiceIconProps) => {
  const mode = reverseProxy?.mode;

  switch (mode) {
    case ServiceMode.HTTP:
      return <GlobeIcon size={size} className={cn("shrink-0", className)} />;
    case ServiceMode.TLS:
      return <LockKeyhole size={size} className={cn("shrink-0", className)} />;
    case ServiceMode.TCP:
      return (
        <ArrowRightFromLineIcon
          size={size}
          className={cn("shrink-0", className)}
        />
      );
    case ServiceMode.UDP:
      return (
        <ArrowRightFromLineIcon
          size={size}
          className={cn("shrink-0", className)}
        />
      );
    default:
      return <GlobeIcon size={size} className={cn("shrink-0", className)} />;
  }
};
