import * as React from "react";
import { useMemo } from "react";
import { ReverseProxy, ServiceMode } from "@/interfaces/ReverseProxy";
import { trim } from "lodash";
import { SERVICE_MODES } from "@/modules/reverse-proxy/ReverseProxyServiceModeSelector";
import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { ArrowRightFromLineIcon, GlobeIcon, LockKeyhole } from "lucide-react";

type Props = {
  reverseProxy?: ReverseProxy;
};

export const ReverseProxyTypeCell = ({ reverseProxy }: Props) => {
  const serviceModeLabel = useMemo(() => {
    if (!reverseProxy?.mode) return "HTTPS";
    const mode = SERVICE_MODES[reverseProxy.mode];
    if (!mode) return "HTTPS";
    return trim(mode.label.replace("Service", ""));
  }, [reverseProxy]);

  return (
    <div className={"flex"}>
      <Badge variant={"gray"} className={"font-normal"}>
        <ReverseProxyServiceIcon
          reverseProxy={reverseProxy}
          className={"text-nb-gray-200"}
          size={11}
        />
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
