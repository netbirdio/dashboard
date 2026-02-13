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
};

const POLL_INTERVAL_MS = 3500;

export default function ReverseProxyStatusCell({
  serviceId,
  meta,
  enabled,
}: Readonly<Props>) {
  const status = meta?.status;
  const certificateIssued = !!meta?.certificate_issued_at;

  const isSettingUp =
    enabled &&
    status !== undefined &&
    status !== ReverseProxyStatus.ACTIVE &&
    !certificateIssued;

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

  if (
    !enabled ||
    (currentStatus === ReverseProxyStatus.ACTIVE && currentCertificateIssued)
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
