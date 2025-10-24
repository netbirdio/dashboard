import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

type Props = {
  disabled?: boolean;
  children?: React.ReactNode;
  hasPermission?: boolean;
  side?: "top" | "right" | "bottom" | "left";
};
export const SSHTooltip = ({
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
            <>
              <div>
                This peer is either offline or SSH access is not enabled.
              </div>
              <div>
                Please enable SSH access for this peer in the dashboard and make
                sure SSH is allowed in the NetBird Client under{" "}
                <span className={"text-white"}>Settings &rarr; Allow SSH</span>.
              </div>
              <div>
                Learn more about{" "}
                <InlineLink
                  href={"https://docs.netbird.io/how-to/ssh"}
                  target={"_blank"}
                >
                  SSH <ExternalLinkIcon size={12} />
                </InlineLink>
              </div>
            </>
          ) : (
            <div>
              You do not have permission to launch the SSH console. Please
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
