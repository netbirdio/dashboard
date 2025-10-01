import FullTooltip from "@components/FullTooltip";
import * as React from "react";

type Props = {
  disabled?: boolean;
  children?: React.ReactNode;
  hasPermission?: boolean;
  side?: "top" | "right" | "bottom" | "left";
};
export const RDPTooltip = ({
  disabled,
  children,
  hasPermission,
  side = "top",
}: Props) => {
  return (
    <FullTooltip
      className={"w-full"}
      side={side}
      content={
        <div className={"max-w-xs text-xs flex flex-col gap-2"}>
          {hasPermission ? (
            <div>This peer is offline and cannot be accessed via RDP.</div>
          ) : (
            <div>
              You do not have permission to launch an RDP session. Please
              contact your administrator.
            </div>
          )}
        </div>
      }
      disabled={disabled}
    >
      {children}
    </FullTooltip>
  );
};
