import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import React, { useMemo, useState } from "react";

type Props = {
  text?: string;
  className?: string;
  maxChars?: number;
  maxWidth?: string; // Optional CSS width value
  hideTooltip?: boolean;
};

export default function TruncatedText({
  text,
  className,
  maxChars = 40,
  maxWidth,
  hideTooltip = false,
}: Readonly<Props>) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [open, setOpen] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const charCount = useMemo(() => {
    if (!text) return 0;
    return text.length;
  }, [text]);

  // Check for overflow on mount and when text/maxWidth changes
  React.useEffect(() => {
    const element = contentRef.current;
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    }
  }, [text, maxWidth]);

  // If maxWidth is provided, use overflow detection
  // Otherwise, fall back to character count logic
  const isDisabled = maxWidth
    ? !isOverflowing || hideTooltip
    : charCount <= maxChars || hideTooltip;

  const containerStyle = maxWidth
    ? { maxWidth }
    : { maxWidth: `${maxChars - 2}ch` };

  if (isDisabled) {
    return (
      <div className="w-full min-w-0 inline-block" style={containerStyle}>
        <div ref={contentRef} className={cn(className, "truncate")}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <Tooltip delayDuration={650} open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild={true}>
        <div className="w-full min-w-0 inline-block" style={containerStyle}>
          <div ref={contentRef} className={cn(className, "truncate")}>
            {text}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        alignOffset={20}
        sideOffset={4}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={cn(className, "px-3 py-1.5")}
      >
        <div className="text-neutral-300 flex flex-col gap-1">
          <div className="max-w-xs break-all whitespace-normal text-xs">
            {text}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
