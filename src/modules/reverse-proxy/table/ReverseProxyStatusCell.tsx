import {
  REVERSE_PROXY_TROUBLESHOOTING_DOCS_LINK,
  ReverseProxy,
  ReverseProxyMeta,
  ReverseProxyStatus,
} from "@/interfaces/ReverseProxy";
import useFetchApi from "@utils/api";
import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { CircleAlert, Loader2 } from "lucide-react";
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

  const hasError =
    meta?.status === ReverseProxyStatus.ERROR ||
    dataRef.current?.meta?.status === ReverseProxyStatus.ERROR;

  const isTunnelNotCreated =
    meta?.status === ReverseProxyStatus.TUNNEL_NOT_CREATED ||
    dataRef.current?.meta?.status === ReverseProxyStatus.TUNNEL_NOT_CREATED;

  const certificateIssued =
    !!meta?.certificate_issued_at ||
    !!dataRef.current?.meta?.certificate_issued_at;

  const shouldPoll = !!enabled && !(isActive && (isL4 || certificateIssued));

  const { data } = useFetchApi<ReverseProxy>(
    `/reverse-proxies/services/${serviceId}`,
    true,
    false,
    shouldPoll,
    { refreshInterval: POLL_INTERVAL_MS },
  );

  dataRef.current = data;

  if (!enabled) return null;

  // L4 services don't need certificates
  if (isL4) {
    if (isActive) return null;
    if (hasError) {
      return (
        <div className={"flex"} data-status-cell>
          <FullTooltip
            content={
              <div className={"text-xs max-w-xs"}>
                Something went wrong while setting up this service. See our{" "}
                <InlineLink
                  href={REVERSE_PROXY_TROUBLESHOOTING_DOCS_LINK}
                  target={"_blank"}
                >
                  Troubleshooting Docs
                </InlineLink>{" "}
                for more details.
              </div>
            }
            align={"center"}
            alignOffset={0}
          >
            <div className={"flex"}>
              <Badge variant={"red"}>
                <CircleAlert size={11} />
                Error
              </Badge>
            </div>
          </FullTooltip>
        </div>
      );
    }
    if (isTunnelNotCreated) {
      return (
        <div className={"flex"} data-status-cell>
          <FullTooltip
            content={
              <div className={"text-xs max-w-xs"}>
                The tunnel to the target peer could not be established. See our{" "}
                <InlineLink
                  href={REVERSE_PROXY_TROUBLESHOOTING_DOCS_LINK}
                  target={"_blank"}
                >
                  Troubleshooting Docs
                </InlineLink>{" "}
                for more details.
              </div>
            }
            align={"center"}
            alignOffset={0}
          >
            <div className={"flex"}>
              <Badge variant={"red"}>
                <CircleAlert size={11} />
                Tunnel not created
              </Badge>
            </div>
          </FullTooltip>
        </div>
      );
    }
    return <SettingUpService />;
  }

  // HTTP services: hide once active with certificate issued
  if (isActive && certificateIssued) {
    return <div data-status-cell />;
  }

  if (!certificateIssued) {
    return (
      <div className={"flex"} data-status-cell>
        <Badge variant={"yellow"}>
          <Loader2 size={12} className={"animate-spin"} />
          Issuing certificate...
        </Badge>
      </div>
    );
  }

  return <SettingUpService />;
}

const SettingUpService = () => {
  return (
    <div className={"flex"} data-status-cell>
      <Badge variant={"yellow"}>
        <Loader2 size={14} className={"animate-spin"} />
        Setting up service...
      </Badge>
    </div>
  );
};
