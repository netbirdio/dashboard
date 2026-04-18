import { Modal } from "@components/modal/Modal";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import { PolicyRuleResource } from "@/interfaces/Policy";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peer?: Peer;
};

export const PeerSSHPolicyModal = ({ open, onOpenChange, peer }: Props) => {
  const { t } = useI18n();
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <AccessControlModalContent
        key={open ? "1" : "0"}
        initialProtocol={"netbird-ssh"}
        initialName={t("peerSsh.access")}
        initialDestinationResource={
          peer
            ? ({
                id: peer.id,
                type: "peer",
              } as PolicyRuleResource)
            : undefined
        }
        onSuccess={async (p) => {
          onOpenChange(false);
        }}
      />
    </Modal>
  );
};
