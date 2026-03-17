import * as React from "react";
import { useMemo } from "react";
import { ReverseProxy } from "@/interfaces/ReverseProxy";
import { ReverseProxyServiceIcon } from "@/modules/reverse-proxy/ReverseProxyServiceIcon";
import { trim } from "lodash";
import { SERVICE_MODES } from "@/modules/reverse-proxy/ReverseProxyServiceModeSelector";
import Badge from "@components/Badge";

type Props = {
  reverseProxy?: ReverseProxy;
};

export const ReverseProxyTypeCell = ({ reverseProxy }: Props) => {
  const serviceModeLabel = useMemo(() => {
    if (!reverseProxy?.mode) return "HTTP/S";
    return trim(
      SERVICE_MODES?.[reverseProxy.mode].label.replace("Service", ""),
    );
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
