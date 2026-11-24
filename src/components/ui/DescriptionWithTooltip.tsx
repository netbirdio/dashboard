import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  text?: string;
  className?: string;
  maxChars?: number;
  /** Truncate at the available width instead of at `maxChars`. */
  fluid?: boolean;
};

export default function DescriptionWithTooltip({
  text,
  className,
  maxChars = 30,
  fluid = false,
}: Props) {
  return (
    <TextWithTooltip
      text={text}
      maxChars={maxChars}
      fluid={fluid}
      className={cn("text-sm text-nb-gray-400 whitespace-nowrap", className)}
    />
  );
}
