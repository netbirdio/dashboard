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
import { CrowdSecMode } from "@/interfaces/ReverseProxy";
import Image from "next/image";
import CrowdSecIconImage from "@/assets/integrations/crowdsec.png";

type Props = {
  value: CrowdSecMode;
  onChange: (value: CrowdSecMode) => void;
};

type CrowdSecOption = {
  label: string;
  description?: string;
  icon: ReactNode;
};

const CROWDSEC_OPTIONS: Record<CrowdSecMode, CrowdSecOption> = {
  [CrowdSecMode.OFF]: {
    label: "Disabled",
    icon: <PowerOffIcon size={14} />,
  },
  [CrowdSecMode.ENFORCE]: {
    label: "Enforce",
    description:
      "Blocked IPs are denied immediately. If the bouncer is not yet synced, connections are denied (fail-closed).",
    icon: <ShieldCheckIcon size={14} />,
  },
  [CrowdSecMode.OBSERVE]: {
    label: "Observe",
    description:
      "Blocked IPs are logged but not denied. Use this to evaluate CrowdSec before enforcing.",
    icon: <EyeIcon size={14} />,
  },
};

export const ReverseProxyCrowdSecIPReputation = ({
  value,
  onChange,
}: Props) => {
  const selected = CROWDSEC_OPTIONS[value];

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
          <Label>CrowdSec IP Reputation</Label>
          <HelpText>
            Detect malicious IPs with CrowdSec.{" "}
            <b className={"text-white"}>Enforce</b> to block them or{" "}
            <b className={"text-white"}>Observe</b> to only log without
            blocking.
          </HelpText>
        </div>
      </div>

      <Select value={value} onValueChange={(v) => onChange(v as CrowdSecMode)}>
        <SelectTrigger className="w-[260px]">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {selected.icon}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CROWDSEC_OPTIONS).map(([mode, config]) => (
            <SelectItem
              key={mode}
              value={mode}
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
