import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { GlobeIcon, HelpCircle, PowerOffIcon } from "lucide-react";
import * as React from "react";
import { SetupKey } from "@/interfaces/SetupKey";

type Props = {
  setupKey: SetupKey;
};
export default function SetupKeyStatusCell({ setupKey }: Readonly<Props>) {
  return (
    <div className={"flex gap-4"}>
      {setupKey?.ephemeral && <Ephemeral />}
      {setupKey?.allow_extra_dns_labels && <AllowExtraDNSLabels />}
    </div>
  );
}

const AllowExtraDNSLabels = () => {
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
      <Badge variant="gray">
        <GlobeIcon size={12} className={"shrink-0"} />
        Extra DNS Labels
        <HelpCircle size={12} />
      </Badge>
    </FullTooltip>
  );
};

const Ephemeral = () => {
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
      <Badge variant={"gray"}>
        <PowerOffIcon size={12} className={"shrink-0 text-yellow-400"} />
        Ephemeral
        <HelpCircle size={12} />
      </Badge>
    </FullTooltip>
  );
};
