import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { cn } from "@utils/helpers";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";

type Props = {
  onClick?: () => void;
  name: string;
  description?: string;
  active?: boolean;
  size?: "md" | "lg";
};
export const NetworkInformationSquare = ({
  onClick,
  name,
  description,
  active = false,
  size = "md",
}: Props) => {
  return (
    <button
      className={cn(
        "flex w-full items-center max-w-[450px] gap-4 dark:text-neutral-300 text-neutral-500 transition-all group/network rounded-md",
        onClick
          ? "hover:text-neutral-100 hover:bg-nb-gray-910 cursor-pointer py-2 pl-3 pr-14 relative"
          : "cursor-default",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "bg-nb-gray-800 text-nb-gray-100 rounded-md flex items-center justify-center font-medium relative",
          "uppercase",
          size === "md" ? "h-10 w-10 text-md" : "h-12 w-12 text-lg",
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
            onClick && "group-hover/network:!bg-nb-gray-910",
          )}
        ></div>
      </div>
      <div className={"mt-[0px] flex items-center flex-wrap"}>
        <p
          className={cn(
            "font-medium text-left whitespace-nowrap",
            size == "md" ? "text-sm" : "text-xl leading-none mb-0.5",
          )}
        >
          {name}
        </p>
        <DescriptionWithTooltip
          className={cn("text-left", size == "lg" && "text-md mt-0.5")}
          maxChars={24}
          text={description}
        />
      </div>
      {onClick && (
        <div
          className={
            "absolute right-0 top-0 h-full flex items-center pr-4 text-nb-gray-200 opacity-0 group-hover/network:opacity-100"
          }
        >
          <ArrowRightIcon size={18} />
        </div>
      )}
    </button>
  );
};
