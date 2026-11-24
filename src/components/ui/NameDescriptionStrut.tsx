import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  /** Cancels the flex gap of the row it sits in, since it takes no width. */
  className?: string;
};

/**
 * Reserves the height of a name with a description below it, without taking
 * any width, so a row without a description is as tall as one with.
 * It renders the same two components instead of a fixed pixel height,
 * so it follows them if their text size changes.
 */
export const NameDescriptionStrut = ({ className }: Props) => (
  <div
    aria-hidden={true}
    className={cn(
      "invisible w-0 overflow-hidden flex flex-col shrink-0",
      className,
    )}
  >
    <TextWithTooltip text={" "} hideTooltip={true} />
    <DescriptionWithTooltip text={" "} />
  </div>
);
