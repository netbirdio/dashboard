import * as React from "react";
import { useOidcUser } from "@axa-fr/react-oidc";
import { useReactFlow } from "@xyflow/react";
import { CheckCircle2Icon } from "lucide-react";
import { useApiCall } from "@utils/api";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import {
  InstallPeerChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import {
  draftBoundGroupName,
  getPlaceholderHostname,
  kindHasBoundGroup,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import { Peer } from "@/interfaces/Peer";
import { Group } from "@/interfaces/Group";

// Renders the "Install NetBird" modal once for the whole canvas, driven by the
// shared installModal state (opened from the components sidebar or a placeholder
// peer node's Install button). Server/Agent installs arrive without a setup key
// — the key is generated inside the modal on demand and written back onto the
// placeholder node so reopening Install reuses it.
export const DraftInstallPeerModal = () => {
  const { installModal, setInstallModal } = useDraftMode();
  const { oidcUser: user } = useOidcUser();
  const reactFlow = useReactFlow();
  const groupRequest = useApiCall<Group>("/groups", true);
  const { groups } = useControlCenterData();
  const { changes, markInstallPeerWaiting } = useDraftChangeset();

  const installedChange = React.useMemo(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId) return undefined;
    const draftId = nodeId.replace("peer-", "");
    return changes.find(
      (c): c is InstallPeerChange =>
        c.type === "install-peer" &&
        c.clientId === draftId &&
        !!c.installedPeerId,
    );
  }, [installModal, changes]);

  // The placeholder's canvas name — drives the setup key name and its bound
  // group name.
  const placeholderName = React.useMemo(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId) return undefined;
    const node = reactFlow.getNodes().find((n) => n.id === nodeId);
    const data = node?.data as
      | { placeholderName?: string; placeholderKind?: string }
      | undefined;
    return (
      data?.placeholderName ??
      PLACEHOLDER_BASE_NAMES[data?.placeholderKind ?? ""] ??
      undefined
    );
  }, [installModal, reactFlow]);

  // Suggested hostname for the install commands, used only as a matching
  // fallback. Server/Agent placeholders match by their hidden bound group
  // (reliable; see resolveAutoGroups / useDraftPeerUpgrade), so they don't
  // need a hostname suggestion at all. Only bound-group-less placeholders
  // (user devices) get one so the upgrade watcher can find them.
  const hostname = React.useMemo(() => {
    if (!installModal?.nodeId) return undefined;
    if (kindHasBoundGroup(installModal.placeholderKind)) return undefined;
    return getPlaceholderHostname(reactFlow.getNodes(), installModal.nodeId);
  }, [installModal, reactFlow]);

  // The hostname is written onto the node (like the setup key) so the
  // upgrade watcher can match the registering peer even if placeholders are
  // added/removed later (which would shift the computed suffixes). A
  // placeholder absorbed into a group has no node — the hostname lands on
  // its entry in the group node's draftPeers instead. (Server/Agent get no
  // hostname; the bound group is their match key.)
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

  // Write fields onto the placeholder's own node, or — if it was absorbed into
  // a group (no own node) — onto its entry in that group's draftPeers. Mirrors
  // the installHostname effect so the setup-key artifacts (key id, bound group)
  // are stored for grouped placeholders too, and therefore get cleaned up.
  const writeToPlaceholder = React.useCallback(
    (draftId: string, patch: Record<string, unknown>) => {
      const nodeId = `peer-${draftId}`;
      reactFlow.setNodes((prev) => {
        if (prev.some((n) => n.id === nodeId)) {
          return prev.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
          );
        }
        return prev.map((n) => {
          const held = n.data?.draftPeers as
            | (Peer & Record<string, unknown>)[]
            | undefined;
          if (!held?.some((p) => p.id === draftId)) return n;
          return {
            ...n,
            data: {
              ...n.data,
              draftPeers: held.map((p) =>
                p.id === draftId ? { ...p, ...patch } : p,
              ),
            },
          };
        });
      });
    },
    [reactFlow],
  );

  // Read a placeholder's kind/name/boundGroupId from its own node, or from its
  // draftPeers entry when absorbed (kind rides on the pseudo-peer's os).
  const readPlaceholder = React.useCallback(
    (draftId: string) => {
      const nodeId = `peer-${draftId}`;
      const all = reactFlow.getNodes();
      const own = all.find((n) => n.id === nodeId);
      if (own) {
        const d = own.data as {
          placeholderKind?: string;
          placeholderName?: string;
          boundGroupId?: string;
        };
        return {
          placeholderKind: d?.placeholderKind,
          placeholderName: d?.placeholderName,
          boundGroupId: d?.boundGroupId,
        };
      }
      for (const n of all) {
        const held = n.data?.draftPeers as
          | (Peer & { boundGroupId?: string })[]
          | undefined;
        const entry = held?.find((p) => p.id === draftId);
        if (entry) {
          return {
            placeholderKind: (entry.os ?? "").replace("draft-", "") || undefined,
            placeholderName: entry.name,
            boundGroupId: entry.boundGroupId,
          };
        }
      }
      return {} as {
        placeholderKind?: string;
        placeholderName?: string;
        boundGroupId?: string;
      };
    },
    [reactFlow],
  );

  // Server/Agent placeholders get a hidden, throwaway BOUND identity group,
  // created directly in the API the moment the user generates the setup key
  // (never before — opening/closing the modal leaks nothing, and it's never a
  // draft changeset entry). Its real id rides on the key as an auto-group so
  // the registering peer lands in a unique group; that's how the upgrade
  // watcher matches it back to this placeholder (useDraftPeerUpgrade), after
  // which the group is deleted again. The group id is stored on the node so a
  // reopened Install reuses it instead of creating another.
  const resolveAutoGroups = React.useCallback(async (): Promise<string[]> => {
    const nodeId = installModal?.nodeId;
    const extra = autoGroups ?? [];
    if (!nodeId) return extra;
    const draftId = nodeId.replace("peer-", "");
    const data = readPlaceholder(draftId);
    if (!kindHasBoundGroup(data.placeholderKind)) return extra;

    // Already created on a previous generate — reuse it.
    let boundId = data.boundGroupId;
    if (!boundId) {
      const label =
        data.placeholderName ??
        PLACEHOLDER_BASE_NAMES[data.placeholderKind ?? "agent"] ??
        "Agent";
      const taken = new Set((groups ?? []).map((g) => g.name));
      const created = await groupRequest.post({
        name: draftBoundGroupName(label, taken),
        peers: [],
        resources: [],
      });
      boundId = created?.id;
      // Store onto the node OR its group's draftPeers entry (absorbed) so a
      // reopened Install reuses it and cleanup can later delete it.
      if (boundId) writeToPlaceholder(draftId, { boundGroupId: boundId });
    }
    return boundId ? [boundId, ...extra.filter((g) => g !== boundId)] : extra;
  }, [
    installModal,
    autoGroups,
    readPlaceholder,
    writeToPlaceholder,
    groupRequest,
    groups,
  ]);

  return (
    <Modal
      open={!!installModal}
      onOpenChange={(open) => !open && setInstallModal(null)}
    >
      {installModal && installedChange && (
        <ModalContent maxWidthClass={"max-w-md"}>
          <ModalHeader
            icon={<CheckCircle2Icon size={20} />}
            color={"green"}
            title={"Peer installed"}
            description={`“${installedChange.name}” registered and took the placeholder's place in your draft.`}
          />
          <ModalFooter>
            <ModalClose asChild={true}>
              <Button variant={"primary"} className={"w-full"}>
                Continue
              </Button>
            </ModalClose>
          </ModalFooter>
        </ModalContent>
      )}
      {installModal && !installedChange && (
        <SetupModal
          user={user}
          isUserDevice={installModal.isUserDevice}
          setupKey={installModal.setupKey}
          hostname={hostname}
          autoGroups={autoGroups}
          resolveAutoGroups={resolveAutoGroups}
          keyName={
            placeholderName ? `Draft ${placeholderName}` : undefined
          }
          onSetupKeyGenerated={(key) => {
            const nodeId = installModal.nodeId;
            if (!nodeId || !key?.key) return;
            // Store the key string (for reuse) AND its id (so an abandoned
            // draft can delete the key it created — see cleanup on removal) —
            // onto the node OR, for an absorbed placeholder, its draftPeers
            // entry.
            const draftId = nodeId.replace("peer-", "");
            writeToPlaceholder(draftId, {
              setupKey: key.key,
              setupKeyId: key.id,
            });
            // Flip its changeset issue badge to "Waiting" (the canvas now polls
            // /peers for the machine to register).
            if (key.id) markInstallPeerWaiting(draftId, key.id);
          }}
        />
      )}
    </Modal>
  );
};
