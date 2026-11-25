import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { NameDescriptionStrut } from "@components/ui/NameDescriptionStrut";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  onClick?: () => void;
  name: string;
  description?: string;
  active?: boolean;
  size?: "md" | "lg";
  /** Truncate name and description at the available width instead of a fixed length. */
  fluid?: boolean;
};
export const NetworkInformationSquare = ({
  onClick,
  name,
  description,
  active = false,
  size = "md",
  fluid = false,
}: Props) => {
  return (
    <button
      className={cn(
        "flex min-w-0 items-center gap-4 text-nb-gray-300 dark:text-neutral-300 transition-all group/network rounded-md",
        fluid ? "w-fit max-w-full" : "w-full max-w-[450px]",
        // The highlight spans the table cell, not just the text: it is drawn
        // against the cell's content box and shown while the cell is hovered
        // (the column sets `group/name-cell`).
        onClick &&
          (fluid
            ? "before:absolute before:inset-0 before:-z-[1] before:rounded-md before:transition-all group-hover/name-cell:before:bg-nb-gray-900/60"
            : "hover:bg-nb-gray-900/60"),
        onClick
          ? "hover:text-nb-gray-100 dark:hover:text-neutral-100 group-hover/table-row:text-nb-gray-100 dark:group-hover/table-row:text-neutral-100 cursor-pointer py-2 pl-2 pr-4"
          : "cursor-default",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "bg-nb-gray-800 text-nb-gray-100 rounded-md flex items-center justify-center font-medium relative transition-all",
          onClick &&
            "group-hover/network:bg-nb-gray-600 group-hover/table-row:bg-nb-gray-600",
          "uppercase",
          size === "md" ? "h-[38px] w-[38px] text-md" : "h-12 w-12 text-lg",
          "shrink-0",
        )}
      >
        {name.substring(0, 2)}
        <div
          className={cn(
            "h-2 w-2 rounded-full absolute bottom-0 right-0 z-10",
            active ? "bg-green-500" : "bg-nb-gray-700",
          )}
        ></div>
        <div
          className={cn(
            "h-3 w-3 bg-nb-gray-950 rounded-tl-[8px] rounded-br absolute bottom-0 right-0 transition-all",
            onClick && "group-hover/table-row:bg-nb-gray-940",
            onClick &&
              (fluid
                ? "group-hover/name-cell:!bg-nb-gray-910"
                : "group-hover/network:!bg-nb-gray-910"),
          )}
        ></div>
      </div>
      {size === "md" && <NameDescriptionStrut className={"-ml-4"} />}
      <div
        className={cn(
          "mt-[0px] flex items-start flex-col min-w-0",
          !fluid && "flex-wrap",
        )}
      >
        {size === "md" ? (
          <TextWithTooltip
            text={name}
            maxChars={25}
            fluid={fluid}
            className={"font-normal text-left"}
          />
        ) : (
          <p
            className={
              "font-medium text-left whitespace-nowrap text-xl leading-none mb-0.5"
            }
          >
            {name}
          </p>
        )}
        <DescriptionWithTooltip
          className={cn("text-left", size == "lg" && "text-md mt-0.5")}
          maxChars={24}
          fluid={fluid}
          text={description}
        />
      </div>
    </button>
  );
};
