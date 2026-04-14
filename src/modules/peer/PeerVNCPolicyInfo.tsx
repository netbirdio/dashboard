import { Callout } from "@components/Callout";
import { InlineButtonLink } from "@components/InlineLink";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import { Peer } from "@/interfaces/Peer";
import { PeerVNCPolicyModal } from "@/modules/peer/PeerVNCPolicyModal";
import { usePeerVNCPolicyCheck } from "@/modules/peer/usePeerVNCPolicyCheck";

type Props = {
  peer?: Peer;
  className?: string;
};

export const PeerVNCPolicyInfo = ({ peer, className }: Props) => {
  const { showVNCPolicyInfo } = usePeerVNCPolicyCheck(peer);
  const [policyModal, setPolicyModal] = useState(false);
  return (
    showVNCPolicyInfo && (
      <>
        <Callout className={cn("max-w-xl", className)} variant={"warning"}>
          <span>
            VNC requires an access control policy to allow VNC connections to
            this machine.{" "}
            <InlineButtonLink onClick={() => setPolicyModal(true)}>
              Create VNC Policy
            </InlineButtonLink>
          </span>
        </Callout>
        <PeerVNCPolicyModal
          open={policyModal}
          onOpenChange={setPolicyModal}
          peer={peer}
        />
      </>
    )
  );
};
