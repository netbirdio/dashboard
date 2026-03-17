import { ReverseProxy, ServiceMode } from "@/interfaces/ReverseProxy";
import { cn } from "@utils/helpers";
import { ArrowRightFromLineIcon, GlobeIcon, LockKeyhole } from "lucide-react";
import * as React from "react";

type Props = {
  reverseProxy?: ReverseProxy;
  className?: string;
  size?: number;
};

export const ReverseProxyServiceIcon = ({
  reverseProxy,
  className,
  size = 14,
}: Props) => {
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
