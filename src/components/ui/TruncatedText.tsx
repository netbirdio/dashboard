import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import React, { useMemo, useState } from "react";

type Props = {
  text?: string;
  children?: React.ReactNode;
  tooltipContent?: React.ReactNode;
  className?: string;
  maxChars?: number;
  maxWidth?: string; // Optional CSS width value
  hideTooltip?: boolean;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
};

export default function TruncatedText({
  text,
  children,
  tooltipContent,
  className,
  maxChars = 40,
  maxWidth,
  hideTooltip = false,
  align,
  alignOffset = 20,
  side,
  sideOffset = 4,
}: Readonly<Props>) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [open, setOpen] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);

  const hasCustomChildren = !!children;
  const content = children ?? text;

  const charCount = useMemo(() => {
    if (!text) return 0;
    return text.length;
  }, [text]);

  // Check for overflow on mount and when text/maxWidth changes
  // When custom children are provided, use a hidden measurement element
  // to detect overflow independently of children's own truncation
  React.useEffect(() => {
    const container = contentRef.current;
    const measure = measureRef.current;
    if (hasCustomChildren && container && measure) {
      setIsOverflowing(measure.scrollWidth > container.clientWidth);
    } else if (container) {
      setIsOverflowing(container.scrollWidth > container.clientWidth);
    }
  }, [text, children, maxWidth, hasCustomChildren]);

  // If maxWidth is provided, use overflow detection
  // Otherwise, fall back to character count logic
  const isDisabled = maxWidth
    ? !isOverflowing || hideTooltip
    : charCount <= maxChars || hideTooltip;

  const containerStyle = maxWidth
    ? { maxWidth }
    : { maxWidth: `${maxChars - 2}ch` };

  const measureElement = hasCustomChildren && text && (
    <span
      ref={measureRef}
      className="absolute invisible whitespace-nowrap pointer-events-none h-0 overflow-hidden"
      aria-hidden="true"
    >
      {text}
    </span>
  );

  if (isDisabled) {
    return (
      <div
        className={cn(
          "w-full min-w-0 inline-block",
          hasCustomChildren && "relative",
        )}
        style={containerStyle}
      >
        {measureElement}
        <div ref={contentRef} className={cn(className, "truncate")}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <Tooltip delayDuration={650} open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild={true}>
        <div
          className={cn(
            "w-full min-w-0 inline-block",
            hasCustomChildren && "relative",
          )}
          style={containerStyle}
        >
          {measureElement}
          <div ref={contentRef} className={cn(className, "truncate")}>
            {content}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={cn(className, "px-3 py-1.5")}
      >
        {tooltipContent ?? (
          <div className="text-neutral-300 flex flex-col gap-1">
            <div className="max-w-xs break-all whitespace-normal text-xs">
              {text}
            </div>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
