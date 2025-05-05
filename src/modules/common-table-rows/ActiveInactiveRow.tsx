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
  additionalInfo?: React.ReactNode;
  dataCy?: string;
};

export default function ActiveInactiveRow({
  active,
  children,
  text,
  leftSection,
  inactiveDot = "gray",
  className,
  additionalInfo,
  dataCy,
}: Readonly<Props>) {
  return (
    <div
      className={cn(
        "gap-3 dark:text-neutral-300 text-neutral-500 min-w-0",
        className,
      )}
      data-cy={dataCy}
    >
      {leftSection}
      <div className={"flex flex-col gap-1"}>
        <div className={"flex gap-2.5 items-start"}>
          <CircleIcon
            active={active}
            inactiveDot={inactiveDot}
            className={"mt-[0.34rem] shrink-0"}
          />
          <div className={"flex flex-col min-w-0"}>
            <div
              className={"font-medium flex gap-2 items-center justify-center"}
            >
              <TextWithTooltip text={text as string} maxChars={25} />
              {additionalInfo}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
