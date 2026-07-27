import { useCallback } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { clearDraftStorage } from "@/modules/control-center/draft/draft-storage";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";

// Leaving draft mode (Cancel, back arrow, Live tab) destroys the changeset —
// guarded by a confirmation while changes are pending so nothing is discarded
// by accident. Deploy uses exitAfterDeploy: the changes were applied, nothing
// to confirm.
export function useDiscardDraft() {
  const { setIsDraft, newDraftSession } = useDraftMode();
  const { changeCount, clearChanges } = useDraftChangeset();
  const { setLayoutInitialized } = useCanvasState();
  const { confirm } = useDialog();

  const exitDraft = useCallback(() => {
    clearChanges();
    clearDraftStorage();
    setIsDraft(false);
  }, [clearChanges, setIsDraft]);

  // After a deploy the live data changed — force the live view to rebuild
  // instead of restoring the stale pre-draft canvas.
  const exitAfterDeploy = useCallback(() => {
    exitDraft();
    setLayoutInitialized(false);
  }, [exitDraft, setLayoutInitialized]);

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
    clearChanges();
    clearDraftStorage();
    newDraftSession();
    return true;
  }, [changeCount, confirm, clearChanges, newDraftSession]);

  return { discardAndExit, exitAfterDeploy, startNewDraft };
}
