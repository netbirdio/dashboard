import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import { PowerOffIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
    peer: Peer;
};
export const EphemeralPeerIndicator = ({ peer }: Props) => {
  const { t } = useI18n();
  if (!peer.ephemeral) {
    return null;
  }

  const tooltipContent = t("peer.ephemeralTooltip");

  return (
    <FullTooltip content={<div className={"text-xs max-w-xs"}>{tooltipContent}</div>}>
      <PowerOffIcon size={12} className={"shrink-0 text-yellow-400"} />
    </FullTooltip>
  );
};
