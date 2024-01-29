import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  text?: string;
  className?: string;
};

export default function DescriptionWithTooltip({ text, className }: Props) {
  return (
    <TextWithTooltip
      text={text}
      maxChars={30}
      className={cn("text-sm text-nb-gray-400 whitespace-nowrap", className)}
    />
  );
}
