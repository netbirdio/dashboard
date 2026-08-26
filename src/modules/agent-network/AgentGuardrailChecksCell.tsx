"use client";

import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { Boxes, ShieldCheckIcon } from "lucide-react";
import * as React from "react";
import { AgentGuardrail } from "@/modules/agent-network/data/mockData";

type Props = {
  guardrail: AgentGuardrail;
  disableHover?: boolean;
  className?: string;
};

export default function AgentGuardrailChecksCell({
  guardrail,
  disableHover = false,
  className,
}: Readonly<Props>) {
  const c = guardrail.checks;
  return (
    <div className={"flex"}>
      <div
        className={cn(
          "flex items-center gap-3 bg-nb-gray-900/80 border border-nb-gray-800/50 py-1 rounded-full px-1 transition-all",
          !disableHover && "hover:bg-nb-gray-800",
          className,
        )}
      >
        <div className={"flex -space-x-2"}>
          {c.model_allowlist.enabled && (
            <FullTooltip
              content={
                <div className={"text-xs"}>
                  Model allowlist · {c.model_allowlist.models.length} model(s)
                </div>
              }
            >
              <div
                className={
                  "bg-gradient-to-tr from-netbird-200 to-netbird-100 h-8 w-8 rounded-full flex items-center justify-center relative z-[10] hover:scale-[1.1] transition-all"
                }
              >
                <Boxes size={14} />
              </div>
            </FullTooltip>
          )}

          {c.prompt_capture.enabled && (
            <FullTooltip
              content={
                <div className={"text-xs"}>
                  Prompt capture · PII redaction
                </div>
              }
            >
              <div
                className={
                  "bg-gradient-to-tr from-blue-500 to-blue-400 h-8 w-8 rounded-full flex items-center justify-center relative z-[8] hover:scale-[1.1] transition-all"
                }
              >
                <ShieldCheckIcon size={14} />
              </div>
            </FullTooltip>
          )}

        </div>
      </div>
    </div>
  );
}
