import { useCallback } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useControlCenterUI } from "@/modules/control-center/contexts/ControlCenterContext";
import { FlowView } from "@/modules/control-center/header/FlowSelector";
import { usePlaceholderArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";

// Leaving draft destroys the changeset; a deploy exits via exitAfterDeploy.
export function useDiscardDraft() {
  const { setIsDraft } = useDraftMode();
  const { changeCount, clearChanges } = useDraftChangeset();
  const { onViewChange } = useControlCenterUI();
  const { confirm } = useDialog();
  const { flushArtifacts } = usePlaceholderArtifacts();

  // Uninstalled placeholders left real setup keys and bound groups behind; the
  // registry covers every one created this session.
  const sweepPlaceholderArtifacts = flushArtifacts;

  const exitDraft = useCallback(() => {
    sweepPlaceholderArtifacts();
    clearChanges();
    setIsDraft(false);
  }, [sweepPlaceholderArtifacts, clearChanges, setIsDraft]);

  // Rebuilds live from scratch instead of restoring the stale pre-draft canvas;
  // the deploy modal clears the changeset itself. Landing on the peer view
  // (the control center's entry default) rather than wherever the draft was
  // entered from; onViewChange also resets layout and selections.
  const exitAfterDeploy = useCallback(() => {
    sweepPlaceholderArtifacts();
    setIsDraft(false);
    onViewChange(FlowView.PEERS);
  }, [sweepPlaceholderArtifacts, setIsDraft, onViewChange]);

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

  return { discardAndExit, exitAfterDeploy };
}
