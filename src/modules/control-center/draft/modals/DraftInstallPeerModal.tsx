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

// Server/Agent installs arrive without a setup key: it is generated on demand
// and written back onto the placeholder node so reopening Install reuses it.
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

  // Only a matching fallback: bound-group placeholders match by that group, so
  // just user devices need a hostname for the upgrade watcher.
  const hostname = React.useMemo(() => {
    if (!installModal?.nodeId) return undefined;
    if (kindHasBoundGroup(installModal.placeholderKind)) return undefined;
    return getPlaceholderHostname(reactFlow.getNodes(), installModal.nodeId);
  }, [installModal, reactFlow]);

  // The hostname is persisted because later placeholder adds/removes would
  // shift the computed suffixes the watcher matches on.
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

  // The hidden bound group is created only when the user generates the key, so
  // opening the modal leaks nothing, and rides on it as the watcher's match key.
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
      // Stored so a reopened Install reuses it and cleanup can delete it.
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
            // The key id lets an abandoned draft delete the key it created.
            const draftId = nodeId.replace("peer-", "");
            writeToPlaceholder(draftId, {
              setupKey: key.key,
              setupKeyId: key.id,
            });
            if (key.id) markInstallPeerWaiting(draftId, key.id);
          }}
        />
      )}
    </Modal>
  );
};
