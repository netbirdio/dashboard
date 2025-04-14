import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  text?: string;
  className?: string;
  maxChars?: number;
};

export default function DescriptionWithTooltip({
  text,
  className,
  maxChars = 30,
}: Props) {
  return (
    <TextWithTooltip
      text={text}
      maxChars={maxChars}
      className={cn("text-sm text-gray-500 dark:text-nb-gray-400 whitespace-nowrap", className)}
    />
  );
}
