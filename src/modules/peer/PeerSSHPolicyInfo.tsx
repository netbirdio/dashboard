import { Callout } from "@components/Callout";
import { InlineButtonLink } from "@components/InlineLink";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import { PeerSSHPolicyModal } from "@/modules/peer/PeerSSHPolicyModal";
import { usePeerSSHPolicyCheck } from "@/modules/peer/usePeerSSHPolicyCheck";

type Props = {
  peer?: Peer;
  className?: string;
};

export const PeerSSHPolicyInfo = ({ peer, className }: Props) => {
  const t = useTranslations();
  const { showSSHPolicyInfo } = usePeerSSHPolicyCheck(peer);
  const [policyModal, setPolicyModal] = useState(false);
  return (
    showSSHPolicyInfo && (
      <>
        <Callout className={cn("max-w-xl", className)} variant={"warning"}>
          <span>
            Starting from NetBird v0.61.0, SSH requires an explicit access
            control policy to allow SSH connections to this machine.{" "}
            <InlineButtonLink onClick={() => setPolicyModal(true)}>
              {t("peer.createSSHPolicy")}
            </InlineButtonLink>
          </span>
        </Callout>
        <PeerSSHPolicyModal
          open={policyModal}
          onOpenChange={setPolicyModal}
          peer={peer}
        />
      </>
    )
  );
};
