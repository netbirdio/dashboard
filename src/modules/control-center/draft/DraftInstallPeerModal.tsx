import * as React from "react";
import { useOidcUser } from "@axa-fr/react-oidc";
import { Modal } from "@components/modal/Modal";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

// Renders the "Install NetBird" modal once for the whole canvas, driven by the
// shared installModal state (opened from the components sidebar or a placeholder
// peer node's Install button).
export const DraftInstallPeerModal = () => {
  const { installModal, setInstallModal } = useDraftMode();
  const { oidcUser: user } = useOidcUser();

  return (
    <Modal
      open={!!installModal}
      onOpenChange={(open) => !open && setInstallModal(null)}
    >
      {installModal && (
        <SetupModal
          user={user}
          isUserDevice={installModal.isUserDevice}
          setupKey={installModal.setupKey}
        />
      )}
    </Modal>
  );
};
