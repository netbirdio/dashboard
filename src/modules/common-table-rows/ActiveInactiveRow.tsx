import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";

type Props = {
  active: boolean;
  children?: React.ReactNode;
  inactiveDot?: "gray" | "red";
  leftSection?: React.ReactNode;
  text?: string | React.ReactNode;
  className?: string;
};
export default function ActiveInactiveRow({
  active,
  children,
  text,
  leftSection,
  inactiveDot = "gray",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex gap-3 dark:text-neutral-300 text-neutral-500 min-w-[250px] max-w-[250px]",
        className,
      )}
    >
      {leftSection}
      <div className={"flex flex-col gap-1"}>
        <div className={"flex gap-2.5 items-start"}>
          <CircleIcon
            active={active}
            inactiveDot={inactiveDot}
            className={"mt-1 shrink-0"}
          />
          <div className={"flex flex-col"}>
            <div className={" font-medium"}>
              <TextWithTooltip text={text as string} maxChars={25} />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
