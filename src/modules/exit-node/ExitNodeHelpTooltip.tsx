import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  hoverButton?: boolean;
};
export const ExitNodeHelpTooltip = ({
  children,
  hoverButton = false,
}: Props) => {
  return (
    <FullTooltip
      hoverButton={hoverButton}
      content={
        <div className={"text-xs max-w-xs"}>
          An exit node is a network route that routes all your internet traffic
          through one of your peers.
          <div className={"mt-2"}>
            Learn more about{" "}
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/configuring-default-routes-for-internet-traffic"
              }
              target={"_blank"}
              className={"mr-1"}
            >
              Exit Nodes
              <ExternalLinkIcon size={10} />
            </InlineLink>
            in our documentation.
          </div>
        </div>
      }
    >
      {children}
    </FullTooltip>
  );
};
