import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

type Props = {
  children: React.ReactNode;
};
export const ExitNodeHelpTooltip = ({ children }: Props) => {
  return (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          An exit node is a network route that routes all your internet traffic
          through one of your peers.
          <div className={"mt-2"}>
            Learn more about{" "}
            <InlineLink href={"#"} target={"_blank"} className={"mr-1"}>
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
