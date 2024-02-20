import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children: React.ReactNode;
  content: React.ReactNode;
  hoverButton?: boolean;
  isAction?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  align?: "end" | "center" | "start";
  side?: "top" | "bottom" | "left" | "right";
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
}: Props) {
  return !disabled ? (
    <TooltipProvider disableHoverableContent={!interactive}>
      <Tooltip delayDuration={1}>
        <TooltipTrigger asChild={true}>
          {hoverButton ? (
            <div
              className={cn(
                isAction ? "cursor-pointer" : "cursor-default",
                "inline-flex  items-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md",
              )}
            >
              {children}
            </div>
          ) : (
            <div className={cn("inline-flex", className)}>{children}</div>
          )}
        </TooltipTrigger>
        {!disabled && (
          <TooltipContent
            alignOffset={20}
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
