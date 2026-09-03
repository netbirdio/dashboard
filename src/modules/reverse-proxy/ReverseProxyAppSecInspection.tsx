import * as React from "react";
import { ReactNode } from "react";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { EyeIcon, PowerOffIcon, ShieldCheckIcon } from "lucide-react";
import { HelpTooltip } from "@components/HelpTooltip";
import { AppSecMode } from "@/interfaces/ReverseProxy";
import Image from "next/image";
import CrowdSecIconImage from "@/assets/integrations/crowdsec.png";

type Props = {
  value: AppSecMode;
  onChange: (value: AppSecMode) => void;
};

type AppSecOption = {
  label: string;
  description?: string;
  icon: ReactNode;
};

const APPSEC_OPTIONS: Record<AppSecMode, AppSecOption> = {
  [AppSecMode.OFF]: {
    label: "Disabled",
    icon: <PowerOffIcon size={14} />,
  },
  [AppSecMode.ENFORCE]: {
    label: "Enforce",
    description:
      "Flagged requests are blocked with 403. Every request is inspected before it reaches the service, and requests are denied if the engine is unreachable (fail-closed).",
    icon: <ShieldCheckIcon size={14} />,
  },
  [AppSecMode.OBSERVE]: {
    label: "Observe",
    description:
      "Flagged requests are logged but still forwarded. Use this to evaluate the rules against real traffic before enforcing.",
    icon: <EyeIcon size={14} />,
  },
};

export const ReverseProxyAppSecInspection = ({ value, onChange }: Props) => {
  const selected = APPSEC_OPTIONS[value];

  return (
    <div className="flex items-center gap-0 justify-between mb-6">
      <div className="flex gap-4">
        <div
          className={
            "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70 shrink-0 relative"
          }
        >
          <Image
            src={CrowdSecIconImage}
            alt={"CrowdSec"}
            className={"rounded-[4px]"}
          />
        </div>
        <div>
          <Label>CrowdSec AppSec (WAF)</Label>
          <HelpText>
            Inspect HTTP requests for exploits.{" "}
            <b className={"text-white"}>Enforce</b> to block them or{" "}
            <b className={"text-white"}>Observe</b> to only log without
            blocking.
          </HelpText>
        </div>
      </div>

      <Select value={value} onValueChange={(v) => onChange(v as AppSecMode)}>
        <SelectTrigger className="w-[260px]" data-testid="appsec-mode-trigger">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {selected.icon}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(APPSEC_OPTIONS).map(([mode, config]) => (
            <SelectItem
              key={mode}
              value={mode}
              data-testid={`appsec-mode-${mode}`}
              extra={
                config.description ? (
                  <HelpTooltip
                    triggerClassName="ml-[0.01rem]"
                    align="center"
                    side="right"
                    content={<>{config.description}</>}
                  />
                ) : undefined
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
