import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import { Label } from "@components/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { ArrowRightFromLine, Globe, LockKeyhole } from "lucide-react";
import React, { ReactNode, useEffect } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  isL4Mode as isL4ServiceMode,
  type ReverseProxyDomain,
  ServiceMode,
} from "@/interfaces/ReverseProxy";

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

export function useServiceModes(): Record<ServiceMode, ServiceModeConfig> {
  const t = useTranslations();
  return {
    [ServiceMode.HTTP]: {
      label: t("reverseProxy.hTTPSService"),
      description: t(
        "reverseProxy.reverseProxyWithPathRoutingAndBuiltInAuthenticationSSOPINPassword",
      ),
      icon: <Globe size={14} />,
    },
    [ServiceMode.TLS]: {
      label: t("reverseProxy.tLSPassthrough"),
      description: t(
        "reverseProxy.passesEncryptedTLSTrafficStraightThroughToTheBackendTypicallyUsedFor",
      ),
      icon: <LockKeyhole size={14} />,
    },
    [ServiceMode.TCP]: {
      label: t("reverseProxy.tCPService"),
      description: t(
        "reverseProxy.forwardsRawTCPTrafficToYourBackendOnADedicatedPortTypically",
      ),
      icon: <ArrowRightFromLine size={14} />,
    },
    [ServiceMode.UDP]: {
      label: t("reverseProxy.uDPService"),
      description: t(
        "reverseProxy.forwardsRawUDPTrafficToYourBackendOnADedicatedPortTypically",
      ),
      icon: <ArrowRightFromLine size={14} />,
    },
  };
}

export const ReverseProxyServiceModeSelector = ({
  value,
  onChange,
  disabled,
  domain,
}: Props) => {
  const t = useTranslations();
  const SERVICE_MODES = useServiceModes();
  const selected = value ?? ServiceMode.HTTP;
  const selectedMode = SERVICE_MODES[selected];
  const isL4Supported = domain?.supports_custom_ports !== undefined;

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
          {t(
            "reverseProxy.selectATypeToDefineHowTheProxyHandlesAndForwardsTraffic",
          )}
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
            data-testid={"service-mode-select-button"}
          >
            {selectedMode.icon}
            <SelectValue placeholder={t("reverseProxy.selectType")} />
          </div>
        </SelectTrigger>
        <SelectContent data-testid={"service-mode-selection"}>
          {Object.entries(SERVICE_MODES)
            .filter(
              ([mode]) =>
                isL4Supported || !isL4ServiceMode(mode as ServiceMode),
            )
            .map(([mode, config]) => (
              <SelectItem
                key={mode}
                value={mode}
                data-testid={`service-mode-option-${mode}`}
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
