import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDialog } from "@/contexts/DialogProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { usePlaceholderArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";

// Leaving draft mode (Cancel, back arrow, Live tab) destroys the changeset —
// guarded by a confirmation while changes are pending so nothing is discarded
// by accident. Deploy uses exitAfterDeploy: the changes were applied, nothing
// to confirm.
export function useDiscardDraft() {
  const { setIsDraft, newDraftSession } = useDraftMode();
  const { changeCount, clearChanges } = useDraftChangeset();
  const { setLayoutInitialized } = useCanvasState();
  const { confirm } = useDialog();
  const reactFlow = useReactFlow();
  const deleteArtifacts = usePlaceholderArtifacts();

  // Abandoning the draft deletes any real artifacts its uninstalled
  // placeholders created (setup keys + hidden bound groups) so nothing is
  // left orphaned in the account. Installed placeholders were upgraded and
  // already cleaned up (useDraftPeerUpgrade), so only "peer-draft-" nodes
  // still carry artifacts.
  const sweepPlaceholderArtifacts = useCallback(() => {
    reactFlow.getNodes().forEach((n) => {
      if (n.id.startsWith("peer-draft-")) {
        const d = n.data as { boundGroupId?: string; setupKeyId?: string };
        if (d?.boundGroupId || d?.setupKeyId) {
          deleteArtifacts({
            boundGroupId: d.boundGroupId,
            setupKeyId: d.setupKeyId,
          });
        }
        return;
      }
      // Placeholders absorbed into a group carry their artifacts on the group
      // node's draftPeers entries instead of on an own node.
      const held = n.data?.draftPeers as
        | { id?: string; boundGroupId?: string; setupKeyId?: string }[]
        | undefined;
      held?.forEach((p) => {
        if (p?.id?.startsWith("draft-") && (p.boundGroupId || p.setupKeyId)) {
          deleteArtifacts({
            boundGroupId: p.boundGroupId,
            setupKeyId: p.setupKeyId,
          });
        }
      });
    });
  }, [reactFlow, deleteArtifacts]);

  const exitDraft = useCallback(() => {
    sweepPlaceholderArtifacts();
    clearChanges();
    setIsDraft(false);
  }, [sweepPlaceholderArtifacts, clearChanges, setIsDraft]);

  // After a deploy the live data changed — force the live view to rebuild
  // instead of restoring the stale pre-draft canvas. The changeset is NOT
  // cleared here: the Review & Deploy modal keeps the deployed items visible
  // (green checks) and clears them once it has closed, so it never flashes an
  // empty "no changes" state on the way out.
  const exitAfterDeploy = useCallback(() => {
    sweepPlaceholderArtifacts();
    setIsDraft(false);
    setLayoutInitialized(false);
  }, [sweepPlaceholderArtifacts, setIsDraft, setLayoutInitialized]);

  // Returns true when the draft was actually exited.
  const discardAndExit = useCallback(async () => {
    if (changeCount > 0) {
      const choice = await confirm({
        title: "Discard draft changes?",
        description: `You have ${changeCount} pending change${
          changeCount !== 1 ? "s" : ""
        } that will be lost. This cannot be undone.`,
        confirmText: "Discard",
        cancelText: "Cancel",
        type: "danger",
        dismissOnOutsideClick: true,
      });
      if (!choice) return false;
    }
    exitDraft();
    return true;
  }, [changeCount, confirm, exitDraft]);

  // Starts a fresh draft (rebuilt from live). Warns — not as a destructive
  // error, just a heads-up — while changes are pending.
  const startNewDraft = useCallback(async () => {
    if (changeCount > 0) {
      const choice = await confirm({
        title: "Start a new draft?",
        description: "Your existing draft and its changes will be lost.",
        confirmText: "New Draft",
        cancelText: "Cancel",
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return false;
    }
    sweepPlaceholderArtifacts();
    clearChanges();
    newDraftSession();
    return true;
  }, [
    changeCount,
    confirm,
    clearChanges,
    newDraftSession,
    sweepPlaceholderArtifacts,
  ]);

  return { discardAndExit, exitAfterDeploy, startNewDraft };
}
