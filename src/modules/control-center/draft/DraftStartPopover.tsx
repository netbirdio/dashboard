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
  // Enter draft on an empty canvas.
  onStartBlank: () => void;
  // Enter draft rebuilt from what's on the canvas right now.
  onUseCurrent: () => void;
  // The anchor the popover positions against (the Live/Draft switcher).
  children: React.ReactNode;
};

// Floating chooser shown when the user opens a draft: build from scratch, or
// carry over the current live view. Styled like the components panel (a
// floating card, no dark overlay) and anchored under the switcher.
//
// modal: Radix disables outside pointer events while open, so ANY click
// (canvas included — a plain outside listener never sees it because the
// ReactFlow pane stops propagation) closes the popover, and clicking the
// Draft tab again toggles it. This is why there's no manual dismissal logic.
export const DraftStartPopover = ({
  open,
  onOpenChange,
  onStartBlank,
  onUseCurrent,
  children,
}: Props) => {
  const choose = (fn: () => void) => {
    onOpenChange(false);
    fn();
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

// Mirrors the components panel's TemplateItem row.
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
