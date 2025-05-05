import * as HoverCard from "@radix-ui/react-hover-card";
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
    <HoverCard.Root
      openDelay={650}
      closeDelay={100}
      open={open}
      onOpenChange={setOpen}
    >
      <HoverCard.Trigger asChild={true}>
        <div className="w-full min-w-0 inline-block" style={containerStyle}>
          <div ref={contentRef} className={cn(className, "truncate")}>
            {text}
          </div>
        </div>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          onMouseLeave={() => setOpen(false)}
          onMouseEnter={() => setOpen(false)}
          alignOffset={20}
          sideOffset={4}
          className={cn(
            "z-[9999] overflow-hidden rounded-md border border-neutral-200 bg-white text-sm text-neutral-950 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-nb-gray-930 dark:bg-nb-gray-940 dark:text-neutral-50",
            className,
            "px-3 py-1.5",
          )}
        >
          <div className="text-neutral-300 flex flex-col gap-1">
            <div className="max-w-xs break-all whitespace-normal text-xs">
              {text}
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
