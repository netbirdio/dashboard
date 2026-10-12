import FullTooltip from "@components/FullTooltip";
import { PowerOffIcon } from "lucide-react";
import * as React from "react";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyStatusCell({ setupKey }: Readonly<Props>) {
  return (
    <div className={"flex items-center gap-1.5"}>
      {setupKey?.ephemeral && <Ephemeral />}
      {setupKey?.allow_extra_dns_labels && <AllowExtraDNSLabels />}
    </div>
  );
}

export const AllowExtraDNSLabels = () => {
  return (
    <FullTooltip
      interactive={false}
      content={
        <div className="max-w-xs text-xs">
          Allow multiple DNS labels in the peer name (e.g. <br />
          host.europe.netbird.io.)
        </div>
      }
    >
      <span
        className={
          "font-mono text-[9px] font-medium tracking-wider leading-none px-1 py-0.5 rounded border border-nb-gray-700 text-nb-gray-300 cursor-help"
        }
      >
        DNS
      </span>
    </FullTooltip>
  );
};

export const Ephemeral = () => {
  return (
    <FullTooltip
      interactive={false}
      content={
        <div className={"max-w-xs text-xs"}>
          Peers that are offline for over 10 minutes will be removed
          automatically.
        </div>
      }
    >
      <PowerOffIcon
        size={12}
        className={"shrink-0 text-yellow-400 cursor-help"}
      />
    </FullTooltip>
  );
};
