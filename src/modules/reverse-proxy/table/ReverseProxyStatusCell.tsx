import {
  ReverseProxy,
  ReverseProxyMeta,
  ReverseProxyStatus,
} from "@/interfaces/ReverseProxy";
import useFetchApi from "@utils/api";
import Badge from "@components/Badge";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

type Props = {
  serviceId: string;
  meta?: ReverseProxyMeta;
  enabled?: boolean;
  isL4?: boolean;
};

const POLL_INTERVAL_MS = 3500;

export default function ReverseProxyStatusCell({
  serviceId,
  meta,
  enabled,
  isL4,
}: Readonly<Props>) {
  const status = meta?.status;
  const certificateIssued = !!meta?.certificate_issued_at;

  const isTerminalStatus =
    status === ReverseProxyStatus.ACTIVE ||
    status === ReverseProxyStatus.ERROR ||
    status === ReverseProxyStatus.TUNNEL_NOT_CREATED;

  const isSettingUp =
    enabled &&
    status !== undefined &&
    !isTerminalStatus &&
    (isL4 || !certificateIssued);

  const { data } = useFetchApi<ReverseProxy>(
    `/reverse-proxies/services/${serviceId}`,
    true,
    false,
    isSettingUp,
    { refreshInterval: POLL_INTERVAL_MS },
  );

  const currentStatus = data?.meta?.status ?? status;

  const currentCertificateIssued = useMemo(() => {
    if (data && data?.meta) return !!data?.meta?.certificate_issued_at;
    return certificateIssued;
  }, [data]);

  if (!enabled) return null;

  // L4 services don't need certificates — hide once active
  if (isL4) {
    if (currentStatus === ReverseProxyStatus.ACTIVE) return null;
    if (currentStatus === ReverseProxyStatus.ERROR) {
      return (
        <div className={"flex"}>
          <Badge variant={"red"}>Error</Badge>
        </div>
      );
    }
    if (currentStatus === ReverseProxyStatus.TUNNEL_NOT_CREATED) {
      return (
        <div className={"flex"}>
          <Badge variant={"red"}>Tunnel not created</Badge>
        </div>
      );
    }
    return (
      <div className={"flex"}>
        <Badge variant={"yellow"}>
          <Loader2 size={14} className={"animate-spin"} />
          Setting up service...
        </Badge>
      </div>
    );
  }

  // HTTP services: hide once active with certificate issued
  if (
    currentStatus === ReverseProxyStatus.ACTIVE &&
    currentCertificateIssued
  ) {
    return null;
  }

  if (!currentCertificateIssued) {
    return (
      <div className={"flex"}>
        <Badge variant={"yellow"}>
          <Loader2 size={12} className={"animate-spin"} />
          Issuing certificate...
        </Badge>
      </div>
    );
  }

  return (
    <div className={"flex"}>
      <Badge variant={"yellow"}>
        <Loader2 size={14} className={"animate-spin"} />
        Setting up service...
      </Badge>
    </div>
  );
}
