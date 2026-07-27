import * as React from "react";
import { useOidcUser } from "@axa-fr/react-oidc";
import { useReactFlow } from "@xyflow/react";
import { Modal } from "@components/modal/Modal";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { getPlaceholderHostname } from "@/modules/control-center/utils/helpers";
import { Peer } from "@/interfaces/Peer";

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
  // added/removed later (which would shift the computed suffixes). A
  // placeholder absorbed into a group has no node — the hostname lands on
  // its entry in the group node's draftPeers instead.
  React.useEffect(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId || !hostname) return;
    const draftId = nodeId.replace("peer-", "");
    reactFlow.setNodes((prev) => {
      if (prev.some((n) => n.id === nodeId)) {
        return prev.map((n) =>
          n.id === nodeId && n.data.installHostname !== hostname
            ? { ...n, data: { ...n.data, installHostname: hostname } }
            : n,
        );
      }
      return prev.map((n) => {
        const held = n.data?.draftPeers as
          | (Peer & { installHostname?: string })[]
          | undefined;
        if (!held?.some((p) => p.id === draftId)) return n;
        return {
          ...n,
          data: {
            ...n.data,
            draftPeers: held.map((p) =>
              p.id === draftId ? { ...p, installHostname: hostname } : p,
            ),
          },
        };
      });
    });
  }, [installModal, hostname, reactFlow]);

  // Existing groups the placeholder was assigned to on the canvas become
  // the setup key's auto-assigned groups — the peer registers already
  // grouped. Draft groups have no API id yet, so they can't ride on the
  // key; their membership deploys with the changeset instead (the upgrade
  // sweep records the real peer id into the create-group entry).
  const autoGroups = React.useMemo(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId) return undefined;
    const draftId = nodeId.replace("peer-", "");
    const ids = new Set<string>();
    reactFlow.getNodes().forEach((n) => {
      const group = (n.data as { group?: { id?: string; name?: string } })
        ?.group;
      if (!group?.id || group.name === "All") return;
      const added = n.data?.addedMembers as Set<string> | undefined;
      if (added?.has(draftId)) ids.add(group.id);
    });
    return ids.size > 0 ? Array.from(ids) : undefined;
  }, [installModal, reactFlow]);

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
          autoGroups={autoGroups}
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
