import FullTooltip from "@components/FullTooltip";
import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { PeerDisapprovalReason } from "@/cloud/edr/PeerDisapprovalReason";
import { useBypassedPeers } from "@/cloud/edr/useBypass";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";

// Returns a ready-to-render issue icon for the peer, or null when the
// peer is healthy. We expose this as a hook (rather than a component
// that may return null) so callers can react to "has issue" before
// committing to a layout slot.
//
// A single AlertTriangle conveys "needs attention"; the colour encodes
// severity and the tooltip carries the specific message.
//   yellow → bypassed (admin override, watch it)
//   red    → everything else (login expired, non-compliant, approval
//            required)
//
// Priority: bypassed → login_expired → non-compliant → approval_required.
export const usePeerIssueIcon = (peer: Peer): React.ReactNode | null => {
  const t = useTranslations();
  const { isAnyIntegrationEnabled, activeIntegrationName } = useIntegrations();
  const { isBypassed: checkBypassed } = useBypassedPeers();
  const isBypassed = peer.id ? checkBypassed(peer.id) : false;

  const ICON_SIZE = 18;

  if (isBypassed) {
    return (
      <FullTooltip
        interactive={false}
        content={
          <div className={"text-xs max-w-xs"}>
            {t("peer.bypassedIssue")}
          </div>
        }
      >
        <AlertTriangle
          size={ICON_SIZE}
          className={"shrink-0 text-yellow-400 cursor-help"}
        />
      </FullTooltip>
    );
  }

  if (peer.login_expired) {
    return (
      <FullTooltip
        interactive={false}
        content={
          <div className={"text-xs max-w-xs"}>
            {t("peer.loginExpiredIssue")}
          </div>
        }
      >
        <AlertTriangle
          size={ICON_SIZE}
          className={"shrink-0 text-red-500 cursor-help"}
        />
      </FullTooltip>
    );
  }

  if (peer.approval_required) {
    if (isAnyIntegrationEnabled) {
      return (
        <FullTooltip
          interactive={false}
          content={
            <div className={"max-w-xs text-xs"}>
              <div>
                {t("peer.notCompliantIssue", {
                  integration: activeIntegrationName,
                })}
              </div>
              <PeerDisapprovalReason peer={peer} />
            </div>
          }
        >
          <AlertTriangle
            size={ICON_SIZE}
            className={"shrink-0 text-red-500 cursor-help"}
          />
        </FullTooltip>
      );
    }
    return (
      <FullTooltip
        interactive={false}
        content={
          <div className={"text-xs max-w-xs"}>
            {t("peer.approvalRequiredIssue")}
          </div>
        }
      >
        <AlertTriangle
          size={ICON_SIZE}
          className={"shrink-0 text-red-500 cursor-help"}
        />
      </FullTooltip>
    );
  }

  return null;
};
