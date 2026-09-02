import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { useApiCall } from "@utils/api";
import { useReactFlow } from "@xyflow/react";
import { CheckCircle2Icon } from "lucide-react";
import * as React from "react";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { SetupKey } from "@/interfaces/SetupKey";
import {
  InstallPeerChange,
  useDraftChangeset,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { usePlaceholderArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";
import {
  draftBoundGroupName,
  getPlaceholderHostname,
  kindHasBoundGroup,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

// Server/Agent installs arrive without a setup key: it is generated on demand
// and written back onto the placeholder node so reopening Install reuses it.
export const DraftInstallPeerModal = () => {
  const { installModal, setInstallModal } = useDraftMode();
  const { oidcUser: user } = useOidcUser();
  const reactFlow = useReactFlow();
  const groupRequest = useApiCall<Group>("/groups", true);
  const keyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const { groups } = useControlCenterData();
  const { changes, markInstallPeerWaiting, clearInstallPeerKey } =
    useDraftChangeset();
  const { registerArtifacts, registeredSetupKeyId, revokeSetupKey } =
    usePlaceholderArtifacts();

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

  // Drives the setup key name and the bound group name.
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

  // Only a matching fallback for user devices; bound-group placeholders match by group.
  const hostname = React.useMemo(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId) return undefined;
    if (kindHasBoundGroup(installModal.placeholderKind)) return undefined;
    const all = reactFlow.getNodes();
    const own = all.find((n) => n.id === nodeId);
    let stamped = (own?.data as { installHostname?: string } | undefined)
      ?.installHostname;
    if (!stamped) {
      const draftId = nodeId.replace("peer-", "");
      for (const n of all) {
        const held = n.data?.draftPeers as
          | (Peer & { installHostname?: string })[]
          | undefined;
        const entry = held?.find((p) => p.id === draftId);
        if (entry?.installHostname) {
          stamped = entry.installHostname;
          break;
        }
      }
    }
    return stamped ?? getPlaceholderHostname(all, nodeId);
  }, [installModal, reactFlow]);

  // Only the FIRST stamp counts — the copied command and the watcher carry it. The
  // timestamp lets the watcher refuse peers that pre-date this install.
  React.useEffect(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId || !hostname) return;
    const draftId = nodeId.replace("peer-", "");
    const stamp = { installHostname: hostname, installStartedAt: Date.now() };
    reactFlow.setNodes((prev) => {
      if (prev.some((n) => n.id === nodeId)) {
        return prev.map((n) =>
          n.id === nodeId && !n.data.installHostname
            ? { ...n, data: { ...n.data, ...stamp } }
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
              p.id === draftId && !p.installHostname ? { ...p, ...stamp } : p,
            ),
          },
        };
      });
    });
  }, [installModal, hostname, reactFlow]);

  // Canvas group assignments ride on the setup key so the peer registers
  // already grouped. Draft groups have no API id yet and deploy separately.
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

  // A placeholder absorbed into a group has no node of its own; its fields live
  // on its entry in that group's draftPeers.
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

  // The kind rides on the absorbed pseudo-peer's os field.
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
          setupKeyId?: string;
        };
        return {
          placeholderKind: d?.placeholderKind,
          placeholderName: d?.placeholderName,
          boundGroupId: d?.boundGroupId,
          setupKeyId: d?.setupKeyId,
        };
      }
      for (const n of all) {
        const held = n.data?.draftPeers as
          | (Peer & { boundGroupId?: string; setupKeyId?: string })[]
          | undefined;
        const entry = held?.find((p) => p.id === draftId);
        if (entry) {
          return {
            placeholderKind: (entry.os ?? "").replace("draft-", "") || undefined,
            placeholderName: entry.name,
            boundGroupId: entry.boundGroupId,
            setupKeyId: entry.setupKeyId,
          };
        }
      }
      return {} as {
        placeholderKind?: string;
        placeholderName?: string;
        boundGroupId?: string;
        setupKeyId?: string;
      };
    },
    [reactFlow],
  );

  // Undo can restore a node whose key was revoked on removal, and SetupModal hides
  // its generator whenever a key is passed. Clear a dead key on open so it returns.
  const [keyRevoked, setKeyRevoked] = React.useState(false);
  React.useEffect(() => {
    const nodeId = installModal?.nodeId;
    if (!nodeId || !installModal?.setupKey) {
      setKeyRevoked(false);
      return;
    }
    const draftId = nodeId.replace("peer-", "");
    const setupKeyId = readPlaceholder(draftId).setupKeyId;
    if (!setupKeyId) return;
    let cancelled = false;
    void (async () => {
      const key = await keyRequest.get(`/${setupKeyId}`).catch(() => undefined);
      if (cancelled) return;
      // Absent counts as dead too: teardown may already have deleted it.
      if (key && !key.revoked) return;
      setKeyRevoked(true);
      writeToPlaceholder(draftId, { setupKey: undefined, setupKeyId: undefined });
      clearInstallPeerKey(draftId);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the open modal, not on the identity of the readers
  }, [installModal?.nodeId, installModal?.setupKey]);

  // The bound group is created only when the user generates the key, so opening
  // the modal creates nothing, and rides on the key as the watcher's match key.
  const resolveAutoGroups = React.useCallback(async (): Promise<string[]> => {
    const nodeId = installModal?.nodeId;
    const extra = autoGroups ?? [];
    if (!nodeId) return extra;
    const draftId = nodeId.replace("peer-", "");
    const data = readPlaceholder(draftId);
    if (!kindHasBoundGroup(data.placeholderKind)) return extra;

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
      // Stored so a reopened Install reuses it; registered so teardown owns it.
      if (boundId) {
        writeToPlaceholder(draftId, { boundGroupId: boundId });
        registerArtifacts(draftId, { boundGroupId: boundId });
      }
    }
    return boundId ? [boundId, ...extra.filter((g) => g !== boundId)] : extra;
  }, [
    installModal,
    autoGroups,
    readPlaceholder,
    writeToPlaceholder,
    registerArtifacts,
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
          setupKey={keyRevoked ? undefined : installModal.setupKey}
          hostname={hostname}
          autoGroups={autoGroups}
          resolveAutoGroups={resolveAutoGroups}
          keyName={
            placeholderName ? `Draft ${placeholderName}` : undefined
          }
          onSetupKeyGenerated={(key) => {
            const nodeId = installModal.nodeId;
            if (!nodeId || !key?.key) return;
            // The key id lets an abandoned draft delete the key it created.
            const draftId = nodeId.replace("peer-", "");
            // Undo can strip the previous key off the node while it stays live; a
            // superseded credential must not stay usable alongside its replacement.
            const superseded = registeredSetupKeyId(draftId);
            if (superseded && superseded !== key.id) {
              revokeSetupKey(superseded);
            }
            writeToPlaceholder(draftId, {
              setupKey: key.key,
              setupKeyId: key.id,
            });
            if (key.id) {
              // Registered as a pair so a reused group shares its new key's
              // teardown generation.
              const boundGroupId = readPlaceholder(draftId).boundGroupId;
              registerArtifacts(draftId, {
                setupKeyId: key.id,
                ...(boundGroupId ? { boundGroupId } : {}),
              });
              markInstallPeerWaiting(draftId, key.id);
            }
          }}
        />
      )}
    </Modal>
  );
};
