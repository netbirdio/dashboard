import * as React from "react";
import { useState } from "react";
import { cn } from "@utils/helpers";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { GitPullRequestArrowIcon, PencilLineIcon } from "lucide-react";
import CircleIcon from "@/assets/icons/CircleIcon";
import Button from "@components/Button";
import { SmallBadge } from "@components/ui/SmallBadge";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";
import { ReviewDeployModal } from "@/modules/control-center/draft/ReviewDeployModal";
import { DraftNameModal } from "@/modules/control-center/draft/DraftNameModal";
import { useNetcodeDraft } from "@/modules/control-center/netcode/NetcodeDraftContext";

type Props = {};
export const DraftModeSwitcher = ({}: Props) => {
  const { isDraft, setIsDraft } = useDraftMode();
  const { changeCount } = useDraftChangeset();
  const { discardAndExit, exitAfterDeploy } = useDiscardDraft();
  const { activeDraft, draftName, saveDraft, isSaving, isDeploying } =
    useNetcodeDraft();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const mode = isDraft ? "draft" : "live";

  const handleSave = () => {
    // First save of an unnamed draft asks for a name; later saves reuse it.
    if (!activeDraft) {
      setNameModalOpen(true);
      return;
    }
    void saveDraft();
  };

  const handleSwitch = (v: string) => {
    if (v === "draft") {
      setIsDraft(true);
      return;
    }
    // Switching to live destroys the draft — confirmed while changes exist.
    void discardAndExit();
  };

  return (
    // The id lets the group panel match its width to this action row
    // (Cancel · Review & Deploy · Live/Draft) via ResizeObserver.
    <div id={"cc-header-actions"} className={"flex items-center gap-3"}>
      {isDraft && (
        <>
          <Button
            variant={"secondary"}
            size={"xs"}
            onClick={() => void discardAndExit()}
            className={"h-[39px] px-4.5"}
            data-testid={"cc-draft-cancel"}
          >
            Cancel
          </Button>
          <Button
            variant={"secondary"}
            size={"xs"}
            onClick={handleSave}
            disabled={isSaving || isDeploying || changeCount === 0}
            className={"h-[39px] px-4.5"}
            data-testid={"cc-draft-save"}
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            variant={"primary"}
            size={"xs"}
            className={
              "h-[39px] px-4.5 disabled:!opacity-90 disabled:!bg-nb-gray-940 disabled:!text-nb-gray-800 disabled:!border disabled:!border-nb-gray-930/80"
            }
            disabled={changeCount === 0}
            onClick={() => setReviewOpen(true)}
            data-testid={"cc-draft-review"}
          >
            <GitPullRequestArrowIcon size={14} />
            Review & Deploy
            {changeCount > 0 && (
              <span
                className={
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-black/30 text-[0.68rem] leading-none font-medium"
                }
              >
                {changeCount}
              </span>
            )}
          </Button>
        </>
      )}
      <SegmentedTabs value={mode} onChange={handleSwitch}>
        <SegmentedTabs.List
          className={
            "border-b rounded-b-lg text-sm font-medium bg-nb-gray-930 p-1"
          }
        >
          <SegmentedTabs.Trigger
            value={"live"}
            className={"text-xs px-3 py-[0.45rem]"}
            data-testid={"cc-mode-live"}
          >
            <CircleIcon active={true} size={8} className={"shrink-0"} />
            Live
          </SegmentedTabs.Trigger>
          <SegmentedTabs.Trigger
            value={"draft"}
            className={"text-xs px-3 py-[0.45rem] whitespace-nowrap"}
            data-testid={"cc-mode-draft"}
          >
            <PencilLineIcon size={12} />
            Draft
            {/* Same Beta treatment as the sidebar's Reverse Proxy entry. */}
            <SmallBadge
              text={"Beta"}
              variant={"sky"}
              className={"text-[8px] leading-none py-[3px] px-[5px]"}
              textClassName={"top-0"}
            />
          </SegmentedTabs.Trigger>
        </SegmentedTabs.List>
      </SegmentedTabs>

      <ReviewDeployModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onDeployed={exitAfterDeploy}
      />

      <DraftNameModal
        open={nameModalOpen}
        onOpenChange={setNameModalOpen}
        title={"Save Draft"}
        initialName={draftName === "Untitled Draft" ? "" : draftName}
        onSuccess={(name) => void saveDraft(name)}
      />
    </div>
  );
};
