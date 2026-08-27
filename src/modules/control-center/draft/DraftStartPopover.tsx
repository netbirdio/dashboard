import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Popover, PopoverContent } from "@components/Popover";
import { cn } from "@utils/helpers";
import {
  ChevronRightIcon,
  CirclePlusIcon,
  GroupIcon,
  LucideIcon,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartBlank: () => void;
  onUseCurrent: () => void;
  // the element the popover anchors to
  children: React.ReactNode;
};

// `modal` makes Radix block outside pointer events, so even a canvas click (the
// ReactFlow pane stops propagation) closes it; no manual dismissal needed.
export const DraftStartPopover = ({
  open,
  onOpenChange,
  onStartBlank,
  onUseCurrent,
  children,
}: Props) => {
  const choose = (fn: () => void) => {
    onOpenChange(false);
    // Defer past the close: the scroll-lock teardown forces a reflow that
    // thrashed against the canvas rebuild when run in the same tick.
    requestAnimationFrame(() => fn());
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal>
      <PopoverPrimitive.Anchor asChild>
        {/* Wrapping element so the popover anchor gets a real DOM ref. */}
        <div className={"inline-flex"}>{children}</div>
      </PopoverPrimitive.Anchor>
      <PopoverContent
        align={"end"}
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "w-[320px] p-0 rounded-lg border shadow-xl",
          "dark:bg-nb-gray-935 dark:border-nb-gray-910",
        )}
      >
        <div className={"p-1.5"}>
          <StartOption
            icon={CirclePlusIcon}
            label={"New Empty Draft"}
            description={"Start from a blank canvas"}
            onClick={() => choose(onStartBlank)}
            data-testid={"cc-draft-start-blank-option"}
          />
          <StartOption
            icon={GroupIcon}
            label={"From Current View"}
            description={"Start from the current canvas"}
            onClick={() => choose(onUseCurrent)}
            data-testid={"cc-draft-use-current-option"}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const StartOption = ({
  icon: Icon,
  label,
  description,
  onClick,
  "data-testid": dataTestId,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  "data-testid"?: string;
}) => (
  <button
    onClick={onClick}
    data-testid={dataTestId}
    className={cn(
      "group/item w-full flex items-center h-[52px] rounded-md px-1 text-left transition-colors",
      "hover:bg-nb-gray-900/50 cursor-pointer",
    )}
  >
    <div className={"flex items-center gap-2 flex-1 min-w-0 pl-2 py-0.5"}>
      <div
        className={
          "h-8 w-8 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0 text-nb-gray-200"
        }
      >
        <Icon size={14} />
      </div>
      <div className={"flex flex-col gap-0.5 leading-tight min-w-0"}>
        <span className={"text-xs text-nb-gray-100"}>{label}</span>
        <span className={"text-[0.72rem] text-nb-gray-400"}>{description}</span>
      </div>
    </div>
    <ChevronRightIcon
      size={14}
      className={
        "shrink-0 ml-auto mr-3 text-nb-gray-500 transition-colors group-hover/item:text-nb-gray-300"
      }
    />
  </button>
);
