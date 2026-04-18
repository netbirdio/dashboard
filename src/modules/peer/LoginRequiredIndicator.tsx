import FullTooltip from "@components/FullTooltip";
import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};
export const LoginRequiredIndicator = ({ peer }: Props) => {
  const { t } = useI18n();
  if (!peer.login_expired) {
    return null;
  }

  return (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          {t("peer.loginExpiredTooltipLine1")} <br />
          {t("peer.loginExpiredTooltipLine2")}
        </div>
      }
    >
      <AlertTriangle size={14} className={"shrink-0 text-red-500"} />
    </FullTooltip>
  );
};
