import { Callout } from "@components/Callout";
import { InlineButtonLink } from "@components/InlineLink";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import { PeerSSHPolicyModal } from "@/modules/peer/PeerSSHPolicyModal";
import { usePeerSSHPolicyCheck } from "@/modules/peer/usePeerSSHPolicyCheck";

type Props = {
  peer?: Peer;
  className?: string;
};

export const PeerSSHPolicyInfo = ({ peer, className }: Props) => {
  const { t } = useI18n();
  const { showSSHPolicyInfo } = usePeerSSHPolicyCheck(peer);
  const [policyModal, setPolicyModal] = useState(false);
  return (
    showSSHPolicyInfo && (
      <>
        <Callout className={cn("max-w-xl", className)} variant={"warning"}>
          <span>
            {t("peerSsh.explicitPolicyRequired")}{" "}
            <InlineButtonLink onClick={() => setPolicyModal(true)}>
              {t("peerSsh.createPolicy")}
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
