import React, { ReactNode, useEffect } from "react";
import {
  isL4Mode as isL4ServiceMode,
  type ReverseProxyDomain,
  ServiceMode,
} from "@/interfaces/ReverseProxy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { ArrowRightFromLine, Globe, LockKeyhole } from "lucide-react";
import { HelpTooltip } from "@components/HelpTooltip";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  value?: ServiceMode;
  onChange: (value: ServiceMode) => void;
  disabled?: boolean;
  domain?: ReverseProxyDomain;
};

type ServiceModeConfig = {
  label: string;
  description: string;
  icon: ReactNode;
};

type ServiceModeStaticConfig = {
  label: string;
  description: string;
};

export const SERVICE_MODES: Record<ServiceMode, ServiceModeStaticConfig> = {
  [ServiceMode.HTTP]: {
    label: "HTTP/S Service",
    description: "Proxy HTTP and HTTPS requests to one or more targets.",
  },
  [ServiceMode.TLS]: {
    label: "TLS Passthrough",
    description: "Pass encrypted TLS traffic directly to the target.",
  },
  [ServiceMode.TCP]: {
    label: "TCP Service",
    description: "Forward raw TCP traffic to a selected target and port.",
  },
  [ServiceMode.UDP]: {
    label: "UDP Service",
    description: "Forward UDP traffic to a selected target and port.",
  },
};

export const ReverseProxyServiceModeSelector = ({
  value,
  onChange,
  disabled,
  domain,
}: Props) => {
  const { t } = useI18n();
  const selected = value ?? ServiceMode.HTTP;
  const serviceModes: Record<ServiceMode, ServiceModeConfig> = {
    [ServiceMode.HTTP]: {
      label: t("reverseProxy.serviceModeHttp"),
      description: t("reverseProxy.serviceModeHttpDescription"),
      icon: <Globe size={14} />,
    },
    [ServiceMode.TLS]: {
      label: t("reverseProxy.serviceModeTls"),
      description: t("reverseProxy.serviceModeTlsDescription"),
      icon: <LockKeyhole size={14} />,
    },
    [ServiceMode.TCP]: {
      label: t("reverseProxy.serviceModeTcp"),
      description: t("reverseProxy.serviceModeTcpDescription"),
      icon: <ArrowRightFromLine size={14} />,
    },
    [ServiceMode.UDP]: {
      label: t("reverseProxy.serviceModeUdp"),
      description: t("reverseProxy.serviceModeUdpDescription"),
      icon: <ArrowRightFromLine size={14} />,
    },
  };
  const selectedMode = serviceModes[selected];
  const isL4Supported = domain?.supports_custom_ports === true;

  // Reset to HTTP if the current L4 mode becomes unsupported (e.g. domain changed)
  useEffect(() => {
    if (!isL4Supported && isL4ServiceMode(selected)) {
      onChange(ServiceMode.HTTP);
    }
  }, [isL4Supported, selected, onChange]);

  return (
    <div className="flex justify-between items-center gap-10 mt-2">
      <div>
        <Label>{t("reverseProxy.serviceType")}</Label>
        <HelpText>
          {t("reverseProxy.serviceTypeHelp")}
        </HelpText>
      </div>
      <Select
        value={selected}
        onValueChange={(v) => onChange(v as ServiceMode)}
        disabled={disabled}
      >
        <SelectTrigger className="max-w-[240px] min-w-[200px]">
          <div
            className={"flex items-center gap-2 whitespace-nowrap"}
            data-cy={"service-mode-select-button"}
          >
            {selectedMode.icon}
            <SelectValue placeholder={t("reverseProxy.selectServiceType")} />
          </div>
        </SelectTrigger>
        <SelectContent data-cy={"service-mode-selection"}>
          {Object.entries(serviceModes)
            .filter(
              ([mode]) =>
                isL4Supported || !isL4ServiceMode(mode as ServiceMode),
            )
            .map(([mode, config]) => (
              <SelectItem
                key={mode}
                value={mode}
                extra={
                  <HelpTooltip
                    triggerClassName={"ml-[0.01rem]"}
                    align={"center"}
                    side={"right"}
                    content={<>{config.description}</>}
                  />
                }
              >
                <span className="whitespace-nowrap">{config.label}</span>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
};
