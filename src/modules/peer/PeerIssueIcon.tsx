import FullTooltip from "@components/FullTooltip";
import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";

// Returns a ready-to-render issue icon for the peer, or null when the
// peer is healthy. We expose this as a hook (rather than a component
// that may return null) so callers can react to "has issue" before
// committing to a layout slot.
//
// A single red AlertTriangle conveys "needs attention"; the tooltip
// carries the specific message (login expired or approval required).
//
// Priority: login_expired → approval_required.
export const usePeerIssueIcon = (peer: Peer): React.ReactNode | null => {
  const ICON_SIZE = 18;

  if (peer.login_expired) {
    return (
      <FullTooltip
        interactive={false}
        content={
          <div className={"text-xs max-w-xs"}>
            This peer&apos;s login has expired. Re-authenticate from the
            NetBird client on the device to bring it back online.
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
    return (
      <FullTooltip
        interactive={false}
        content={
          <div className={"text-xs max-w-xs"}>
            This peer needs admin approval before it can connect. Approve it
            from the row&apos;s actions menu.
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
