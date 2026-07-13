import * as React from "react";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { PencilLineIcon, PlayIcon } from "lucide-react";
import CircleIcon from "@/assets/icons/CircleIcon";
import Button from "@components/Button";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

type Props = {};
export const DraftModeSwitcher = ({}: Props) => {
  const { isDraft, setIsDraft } = useDraftMode();
  const mode = isDraft ? "draft" : "live";

  const handleSwitch = (v: string) => {
    setIsDraft(v === "draft");
  };

  return (
    <div className={"flex items-center gap-3"}>
      {isDraft && (
        <>
          <Button
            variant={"secondary"}
            size={"xs"}
            onClick={() => handleSwitch("live")}
            className={"h-[38px] px-4.5"}
          >
            Save
          </Button>
          <Button variant={"primary"} size={"xs"} className={"h-[38px] px-4.5"}>
            <PlayIcon size={12} />
            Save & Apply
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
          >
            <CircleIcon active={true} size={8} className={"shrink-0"} />
            Live
          </SegmentedTabs.Trigger>
          <SegmentedTabs.Trigger
            value={"draft"}
            className={"text-xs px-3 py-[0.45rem] whitespace-nowrap"}
          >
            <PencilLineIcon size={12} />
            Draft
          </SegmentedTabs.Trigger>
        </SegmentedTabs.List>
      </SegmentedTabs>
    </div>
  );
};
