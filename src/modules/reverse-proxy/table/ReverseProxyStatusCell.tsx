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
};

const POLL_INTERVAL_MS = 3500;

export default function ReverseProxyStatusCell({
  serviceId,
  meta,
  enabled,
}: Readonly<Props>) {
  const dataRef = useRef<ReverseProxy | undefined>(undefined);

  const isActive =
    meta?.status === ReverseProxyStatus.ACTIVE ||
    dataRef.current?.meta?.status === ReverseProxyStatus.ACTIVE;

  const certificateIssued =
    !!meta?.certificate_issued_at ||
    !!dataRef.current?.meta?.certificate_issued_at;

  const shouldPoll = !!enabled && !certificateIssued;

  const { data } = useFetchApi<ReverseProxy>(
    `/reverse-proxies/services/${serviceId}`,
    true,
    false,
    shouldPoll,
    { refreshInterval: POLL_INTERVAL_MS },
  );

  dataRef.current = data;

  if (!enabled || (isActive && certificateIssued)) {
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
