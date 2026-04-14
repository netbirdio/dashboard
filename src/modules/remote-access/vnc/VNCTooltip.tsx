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
  const disabled = isOnline && isVNCEnabled && hasPermission;

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
          ) : !isVNCEnabled ? (
            <div>
              VNC server is not enabled on this peer. Enable it with{" "}
              <span className="font-mono">netbird up --allow-server-vnc</span>.
            </div>
          ) : (
            <div>This peer is offline and cannot be accessed via VNC.</div>
          )}
        </div>
      }
      disabled={disabled}
    >
      {children}
    </FullTooltip>
  );
};
