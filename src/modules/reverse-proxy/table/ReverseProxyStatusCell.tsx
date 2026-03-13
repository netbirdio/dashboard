import {
  ReverseProxy,
  ReverseProxyMeta,
  ReverseProxyStatus,
} from "@/interfaces/ReverseProxy";
import useFetchApi from "@utils/api";
import Badge from "@components/Badge";
import { Loader2 } from "lucide-react";
import { useRef } from "react";

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
  const dataRef = useRef<ReverseProxy | undefined>(undefined);

  const isActive =
    meta?.status === ReverseProxyStatus.ACTIVE ||
    dataRef.current?.meta?.status === ReverseProxyStatus.ACTIVE;

  const certificateIssued =
    !!meta?.certificate_issued_at ||
    !!dataRef.current?.meta?.certificate_issued_at;

  const shouldPoll =
    !!enabled && !(isActive && (isL4 || certificateIssued));

  const { data } = useFetchApi<ReverseProxy>(
    `/reverse-proxies/services/${serviceId}`,
    true,
    false,
    shouldPoll,
    { refreshInterval: POLL_INTERVAL_MS },
  );

  dataRef.current = data;

  const currentStatus = data?.meta?.status ?? meta?.status;
  const currentCertificateIssued = data?.meta?.certificate_issued_at
    ? !!data.meta.certificate_issued_at
    : certificateIssued;

  if (!enabled) return null;

  // L4 services don't need certificates
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

  if (!certificateIssued) {
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
