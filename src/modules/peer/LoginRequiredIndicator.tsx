import FullTooltip from "@components/FullTooltip";
import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};
export const LoginRequiredIndicator = ({ peer }: Props) => {
  if (!peer.login_expired) {
    return null;
  }

  return (
    <FullTooltip
      content={
        <div className={"text-xs max-w-xs"}>
          {" "}
          This peer is offline and needs to be <br />
          re-authenticated because its login has expired.
        </div>
      }
    >
      <AlertTriangle size={14} className={"shrink-0 text-red-500"} />
    </FullTooltip>
  );
};
