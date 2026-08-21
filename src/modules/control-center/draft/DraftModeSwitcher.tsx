import Button from "@components/Button";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import {
  ChevronDownIcon,
  GitPullRequestArrowIcon,
  PencilLineIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { DraftStartPopover } from "@/modules/control-center/draft/DraftStartPopover";
import { ReviewDeployModal } from "@/modules/control-center/draft/modals/ReviewDeployModal";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";

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

  // The Live | Draft segmented control. Shown in BOTH modes so the current
  // mode is always obvious (the active segment). In live the Draft segment
  // carries the chooser chevron (opens the blank/current popover); in draft
  // the Live segment switches back (discardAndExit).
  const modeTabs = (withChooserChevron: boolean) => (
    <SegmentedTabs value={mode} onChange={handleSwitch} activationMode={"manual"}>
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
          {withChooserChevron && (
            <ChevronDownIcon
              size={12}
              className={cn(
                "shrink-0 transition-transform",
                startOpen && "rotate-180",
              )}
            />
          )}
        </SegmentedTabs.Trigger>
      </SegmentedTabs.List>
    </SegmentedTabs>
  );

  return (
    // The id lets the group panel match its width to this action row
    // (Cancel · Review & Deploy · Live/Draft) via ResizeObserver.
    <div
      id={"cc-header-actions"}
      className={
        "flex flex-col-reverse items-end gap-3 lg:flex-row lg:items-center"
      }
    >
      {isDraft && (
        <>
          <div className={"flex items-center gap-3"}>
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
          </div>
          {/* Mode indicator while drafting — Draft is active, Live switches
              back (destroys the draft, confirmed when there are changes). */}
          {modeTabs(false)}
        </>
      )}
      {!isDraft && (
        <DraftStartPopover
          open={startOpen}
          onOpenChange={setStartOpen}
          onStartBlank={startBlankDraft}
          onUseCurrent={startCurrentDraft}
        >
          {modeTabs(true)}
        </DraftStartPopover>
      )}

      <ReviewDeployModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onDeployed={exitAfterDeploy}
      />
    </div>
  );
};
