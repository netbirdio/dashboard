import * as React from "react";
import { useState } from "react";
import { cn } from "@utils/helpers";
import { SegmentedTabs } from "@components/SegmentedTabs";
import {
  ChevronDownIcon,
  CirclePlusIcon,
  GitPullRequestArrowIcon,
  PencilLineIcon,
} from "lucide-react";
import CircleIcon from "@/assets/icons/CircleIcon";
import Button from "@components/Button";
import { SmallBadge } from "@components/ui/SmallBadge";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";
import { ReviewDeployModal } from "@/modules/control-center/draft/ReviewDeployModal";
import { DraftStartPopover } from "@/modules/control-center/draft/DraftStartPopover";

// Toggle the Live/Draft segmented control. While off, draft is entered via a
// "New Draft" button that starts from an empty canvas, and Cancel is the only
// way back to live.
const showDraftSwitcher = true;

// Hidden for now — the Draft tab (and Cancel, while drafting) is the only
// entry/exit. Flip to true to bring the Live tab back.
const showLiveTab = false;

type Props = {};
export const DraftModeSwitcher = ({}: Props) => {
  const { isDraft, startBlankDraft, startCurrentDraft } = useDraftMode();
  const { changeCount } = useDraftChangeset();
  const { discardAndExit, exitAfterDeploy } = useDiscardDraft();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const mode = isDraft ? "draft" : "live";

  const handleSwitch = (v: string) => {
    if (v === "draft") {
      // Open the start chooser (blank vs. current view). The tab stays on Live
      // until a choice is made. Closing is handled by the popover itself
      // (modal outside-click / Escape); while open the tab can't be re-clicked
      // to reopen, so this only ever fires from the closed state.
      setStartOpen(true);
      return;
    }
    // Switching to live destroys the draft — confirmed while changes exist.
    setStartOpen(false);
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
      {!isDraft &&
        (showDraftSwitcher ? (
        <DraftStartPopover
          open={startOpen}
          onOpenChange={setStartOpen}
          onStartBlank={startBlankDraft}
          onUseCurrent={startCurrentDraft}
        >
          <SegmentedTabs
            value={mode}
            onChange={handleSwitch}
            activationMode={"manual"}
          >
            <SegmentedTabs.List
              className={
                "border-b rounded-b-lg text-sm font-medium bg-nb-gray-930 p-1"
              }
            >
              {showLiveTab && (
                <SegmentedTabs.Trigger
                  value={"live"}
                  className={"text-xs px-3 py-[0.45rem]"}
                  data-testid={"cc-mode-live"}
                >
                  <CircleIcon active={true} size={8} className={"shrink-0"} />
                  Live
                </SegmentedTabs.Trigger>
              )}
              <SegmentedTabs.Trigger
                value={"draft"}
                className={cn(
                  "text-xs px-3 py-[0.45rem] whitespace-nowrap hover:text-nb-gray-200",
                  // Hold the hover state while the chooser popover is open.
                  startOpen && "bg-nb-gray-900/50 text-nb-gray-200",
                )}
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
                <ChevronDownIcon
                  size={12}
                  className={cn(
                    "shrink-0 transition-transform",
                    startOpen && "rotate-180",
                  )}
                />
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>
        </DraftStartPopover>
        ) : (
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"h-[39px] !px-3 whitespace-nowrap"}
            onClick={() => startBlankDraft()}
            data-testid={"cc-new-draft"}
          >
            <CirclePlusIcon size={14} />
            New Draft
            {/* Same Beta treatment as the sidebar's Reverse Proxy entry. */}
            <SmallBadge
              text={"Beta"}
              variant={"sky"}
              className={"text-[8px] leading-none py-[3px] px-[5px]"}
              textClassName={"top-0"}
            />
          </Button>
        ))}

      <ReviewDeployModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onDeployed={exitAfterDeploy}
      />
    </div>
  );
};
