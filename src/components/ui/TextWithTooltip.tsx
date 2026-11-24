import FullTooltip from "@components/FullTooltip";
import { useOverflowTooltip } from "@hooks/useOverflowTooltip";
import { cn } from "@utils/helpers";
import React, { useMemo } from "react";

type Props = {
  text?: string;
  className?: string;
  maxChars?: number;
  hideTooltip?: boolean;
  /**
   * Truncate at the available width instead of at `maxChars`,
   * and show the tooltip only when the text is actually cut off.
   */
  fluid?: boolean;
};

export default function TextWithTooltip({
  text,
  className,
  maxChars = 40,
  hideTooltip = false,
  fluid = false,
}: Props) {
  const charCount = useMemo(() => {
    if (!text) return 0;
    return text.length;
  }, [text]);

  const {
    ref: textRef,
    open: tooltipOpen,
    onOpenChange: onTooltipOpenChange,
  } = useOverflowTooltip<HTMLDivElement>();

  return (
    <FullTooltip
      disabled={(!fluid && charCount <= maxChars) || hideTooltip}
      customOpen={fluid ? tooltipOpen : undefined}
      customOnOpenChange={fluid ? onTooltipOpenChange : undefined}
      interactive={false}
      className={cn("truncate w-auto min-w-0", fluid && "max-w-full")}
      skipDelayDuration={350}
      delayDuration={200}
      content={
        <div className={"max-w-xs break-all whitespace-normal text-xs"}>
          {text}
        </div>
      }
    >
      <div
        className={"w-full min-w-0 inline-block leading-normal"}
        style={fluid ? undefined : { maxWidth: `${maxChars - 2}ch` }}
      >
        <div ref={textRef} className={cn(className, "truncate")}>
          {text}
        </div>
      </div>
    </FullTooltip>
  );
}
