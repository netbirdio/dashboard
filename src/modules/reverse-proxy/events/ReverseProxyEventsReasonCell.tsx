import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { ListItem } from "@components/ListItem";
import { Info, ShieldAlert } from "lucide-react";
import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

const VERDICT_LABELS: Record<string, string> = {
  crowdsec_ban: "Ban",
  crowdsec_captcha: "Captcha",
  crowdsec_throttle: "Throttle",
  appsec_ban: "Ban",
  appsec_captcha: "Captcha",
  appsec_unavailable: "Unavailable",
};

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsReasonCell = ({ event }: Props) => {
  const metadata = event.metadata;
  // Only one of the two can be the reason a request was flagged without being
  // blocked, since an enforced block sets auth_method_used instead.
  const source = metadata?.appsec_verdict ? "appsec" : "crowdsec";
  const verdictKey = `${source}_verdict`;
  const verdict = metadata?.[verdictKey];

  if (verdict && !event.auth_method_used?.startsWith(`${source}_`)) {
    const verdictLabel = VERDICT_LABELS[verdict] ?? verdict;
    const metaEntries = Object.entries(metadata!).filter(
      ([k]) => k !== verdictKey,
    );

    return (
      <FullTooltip
        side="top"
        interactive
        delayDuration={250}
        skipDelayDuration={100}
        disabled={metaEntries.length === 0}
        contentClassName="p-0"
        content={
          <div className="text-xs flex flex-col">
            {metaEntries.map(([key, val]) => (
              <ListItem
                key={key}
                icon={<Info size={14} />}
                label={key.replaceAll("_", " ")}
                value={<span className="text-nb-gray-200">{val}</span>}
              />
            ))}
          </div>
        }
      >
        <div className="px-3 py-2">
          <Badge variant="gray" className="gap-1.5">
            <ShieldAlert size={12} className="text-yellow-500" />
            {source === "appsec" ? "AppSec" : "CrowdSec"} Observe:{" "}
            {verdictLabel}
          </Badge>
        </div>
      </FullTooltip>
    );
  }

  return (
    <span className="text-nb-gray-300 text-[0.82rem] py-2 text-left">
      {event.reason || "-"}
    </span>
  );
};
