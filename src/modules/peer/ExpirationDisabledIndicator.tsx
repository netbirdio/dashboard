import FullTooltip from "@components/FullTooltip";
import { TimerResetIcon } from "lucide-react";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};
export const ExpirationDisabledIndicator = ({ peer }: Props) => {
  const { t } = useI18n();
  if (peer.login_expiration_enabled) {
    return null;
  }

  const tooltipContent = t("peer.expirationDisabledTooltip");

  return (
    <FullTooltip
      content={<div className={"text-xs max-w-xs"}>{tooltipContent}</div>}
    >
      <TimerResetIcon size={14} className={"shrink-0 text-nb-gray-300"} />
    </FullTooltip>
  );
};
