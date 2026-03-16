import React, { ReactNode } from "react";
import { ServiceMode } from "@/interfaces/ReverseProxy";
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

type Props = {
  value?: ServiceMode;
  onChange: (value: ServiceMode) => void;
  disabled?: boolean;
};

type ServiceModeConfig = {
  label: string;
  description: string;
  icon: ReactNode;
};

// TODO Update descriptions with examples
const SERVICE_MODES: Record<ServiceMode, ServiceModeConfig> = {
  [ServiceMode.HTTP]: {
    label: "HTTP/S Service",
    description: "Reverse proxy with path routing, auth, and load balancing.",
    icon: <Globe size={14} />,
  },
  [ServiceMode.TLS]: {
    label: "TLS Passthrough",
    description: "Direct TCP relay via SNI routing.",
    icon: <LockKeyhole size={14} />,
  },
  [ServiceMode.TCP]: {
    label: "TCP Service",
    description: "TCP relay to a backend on a dedicated port.",
    icon: <ArrowRightFromLine size={14} />,
  },
  [ServiceMode.UDP]: {
    label: "UDP Service",
    description: "UDP relay to a backend on a dedicated port.",
    icon: <ArrowRightFromLine size={14} />,
  },
};

export const ReverseProxyServiceModeSelector = ({
  value,
  onChange,
  disabled,
}: Props) => {
  const selected = value ?? ServiceMode.HTTP;
  const selectedMode = SERVICE_MODES[selected];

  return (
    <div className="flex justify-between items-center gap-10">
      <div>
        <Label>Service Type</Label>
        <HelpText>
          Select a type to define how the proxy handles and forwards traffic to
          your backend services.
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
            <SelectValue placeholder="Select type..." />
          </div>
        </SelectTrigger>
        <SelectContent data-cy={"service-mode-selection"}>
          {Object.entries(SERVICE_MODES).map(([mode, config]) => (
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
