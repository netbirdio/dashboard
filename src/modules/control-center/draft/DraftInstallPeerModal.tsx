import * as React from "react";
import { useOidcUser } from "@axa-fr/react-oidc";
import { useReactFlow } from "@xyflow/react";
import { Modal } from "@components/modal/Modal";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { getPlaceholderHostname } from "@/modules/control-center/utils/helpers";

// Renders the "Install NetBird" modal once for the whole canvas, driven by the
// shared installModal state (opened from the components sidebar or a placeholder
// peer node's Install button). Server/Agent installs arrive without a setup key
// — the key is generated inside the modal on demand and written back onto the
// placeholder node so reopening Install reuses it.
export const DraftInstallPeerModal = () => {
  const { installModal, setInstallModal } = useDraftMode();
  const { oidcUser: user } = useOidcUser();
  const reactFlow = useReactFlow();

  // Suggested hostname for the install commands: the placeholder's canvas
  // name, sanitized and unique across the draft peers (user devices — no
  // nodeId — keep their machine hostname).
  const hostname = React.useMemo(() => {
    if (!installModal?.nodeId) return undefined;
    return getPlaceholderHostname(reactFlow.getNodes(), installModal.nodeId);
  }, [installModal, reactFlow]);

  // The hostname is written onto the node (like the setup key) so the
  // upgrade watcher can match the registering peer even if placeholders are
  // added/removed later (which would shift the computed suffixes).
  React.useEffect(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId || !hostname) return;
    reactFlow.setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId && n.data.installHostname !== hostname
          ? { ...n, data: { ...n.data, installHostname: hostname } }
          : n,
      ),
    );
  }, [installModal, hostname, reactFlow]);

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
          hostname={hostname}
          ephemeralKey={installModal.placeholderKind === "agent"}
          onSetupKeyGenerated={(key) => {
            const nodeId = installModal.nodeId;
            if (!nodeId || !key?.key) return;
            reactFlow.setNodes((prev) =>
              prev.map((n) =>
                n.id === nodeId
                  ? { ...n, data: { ...n.data, setupKey: key.key } }
                  : n,
              ),
            );
          }}
        />
      )}
    </Modal>
  );
};
