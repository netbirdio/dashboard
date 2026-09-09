import FullTooltip from "@components/FullTooltip";
import * as React from "react";

type Props = {
  isOnline?: boolean;
  isVNCEnabled?: boolean;
  children?: React.ReactNode;
  hasPermission?: boolean;
  side?: "top" | "right" | "bottom" | "left";
};
export const VNCTooltip = ({
  isOnline,
  isVNCEnabled,
  children,
  hasPermission,
  side = "top",
}: Props) => {
  // Still shown when NetBird screen sharing is off: the action works in that
  // case, so the tooltip is telling the operator which of the two servers
  // they are about to be offered rather than why they cannot proceed.
  const hideTooltip = isOnline && isVNCEnabled && hasPermission;

  return (
    <FullTooltip
      className={"w-full"}
      side={side}
      content={
        <div className={"max-w-xs text-xs flex flex-col gap-2"}>
          {!hasPermission ? (
            <div>
              You do not have permission to launch a VNC session. Please contact
              your administrator.
            </div>
          ) : !isOnline ? (
            <div>This peer is offline and cannot be accessed via VNC.</div>
          ) : (
            <div>
              NetBird screen sharing is not enabled on this peer. Enable it with{" "}
              <span className="font-mono">netbird up --allow-server-vnc</span>,
              or connect to a VNC server already running on the peer.
            </div>
          )}
        </div>
      }
      disabled={hideTooltip}
    >
      {children}
    </FullTooltip>
  );
};
