import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import React, { useMemo } from "react";

type Props = {
  text?: string;
  className?: string;
  maxChars?: number;
  hideTooltip?: boolean;
};

export default function TextWithTooltip({
  text,
  className,
  maxChars = 40,
  hideTooltip = false,
}: Props) {
  const charCount = useMemo(() => {
    if (!text) return 0;
    return text.length;
  }, [text]);

  return (
    <FullTooltip
      disabled={charCount <= maxChars || hideTooltip}
      interactive={false}
      className={"truncate w-full min-w-0"}
      skipDelayDuration={350}
      delayDuration={200}
      content={
        <div className={"max-w-xs break-all whitespace-normal text-xs"}>
          {text}
        </div>
      }
    >
      <div
        className={"w-full min-w-0 inline-block"}
        style={{
          maxWidth: `${maxChars - 2}ch`,
        }}
      >
        <div className={cn(className, "truncate")}>{text}</div>
      </div>
    </FullTooltip>
  );
}
