import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { cn } from "@utils/helpers";
import React, { useState } from "react";

type Props = {
  children?: React.ReactNode;
  content: React.ReactNode;
  hoverButton?: boolean;
  isAction?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  align?: "end" | "center" | "start";
  side?: "top" | "bottom" | "left" | "right";
  keepOpen?: boolean;
};
export default function FullTooltip({
  children,
  content,
  hoverButton,
  isAction,
  interactive = true,
  disabled,
  className,
  contentClassName,
  align = "center",
  side = "top",
  keepOpen = false,
}: Props) {
  const [open, setOpen] = useState(!!keepOpen);

  const handleOpen = (isOpen: boolean) => {
    if (keepOpen) return;
    setOpen(isOpen);
  };

  return !disabled ? (
    <TooltipProvider disableHoverableContent={!interactive}>
      <Tooltip delayDuration={1} open={open} onOpenChange={handleOpen}>
        {children && (
          <TooltipTrigger asChild={true}>
            {hoverButton ? (
              <div
                className={cn(
                  isAction ? "cursor-pointer" : "cursor-default",
                  "inline-flex  items-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md",
                  className,
                )}
              >
                {children}
              </div>
            ) : (
              <div className={cn("inline-flex", className)}>{children}</div>
            )}
          </TooltipTrigger>
        )}
        {!disabled && (
          <TooltipContent
            alignOffset={20}
            forceMount={true}
            className={contentClassName}
            align={align}
            side={side}
          >
            <div className={"text-neutral-300 flex flex-col gap-1"}>
              {content}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  ) : (
    <div className={cn("inline-flex", className)}>{children}</div>
  );
}
