import * as React from "react";
import FullTooltip from "@components/FullTooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@utils/helpers";
import { TooltipVariants } from "@components/Tooltip";

type Props = {
  content: React.ReactNode;
  children?: React.ReactNode;
  interactive?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  alignOffset?: number;
  sideOffset?: number;
} & TooltipVariants;
export const HelpTooltip = ({
  content,
  children,
  interactive = false,
  className,
  variant = "default",
  triggerClassName,
  align = "start",
  side = "top",
  alignOffset = 0,
  sideOffset,
}: Props) => {
  return (
    <>
      <FullTooltip
        interactive={interactive}
        side={side}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        delayDuration={150}
        variant={variant}
        className={
          "inline underline decoration-dashed underline-offset-[3px] decoration-nb-gray-300 cursor-help transition-all hover:decoration-white"
        }
        content={
          <div className={cn("max-w-xs text-xs", className)}>{content}</div>
        }
      >
        {children ? (
          children
        ) : (
          <span
            className={cn(
              "p-2 -m-2 inline-flex items-center justify-center relative top-[1px] group/help",
              triggerClassName,
            )}
          >
            <HelpCircle
              size={12}
              className={"text-nb-gray-300 group-hover/help:text-nb-gray-100"}
            />
          </span>
        )}
      </FullTooltip>
    </>
  );
};
