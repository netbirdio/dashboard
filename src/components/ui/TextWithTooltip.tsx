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
      className={"truncate w-full"}
      content={
        <div className={"max-w-xs break-all whitespace-normal"}>{text}</div>
      }
    >
      <span className={cn(className, "truncate")}>
        {charCount > maxChars ? text && `${text.slice(0, maxChars)}...` : text}
      </span>
    </FullTooltip>
  );
}
