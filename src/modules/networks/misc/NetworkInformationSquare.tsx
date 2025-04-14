import TruncatedText from "@components/ui/TruncatedText";
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
        "flex w-full items-center max-w-[300px] gap-4 group/network",
        onClick
          ? "interactive-cell pl-3 pr-5 relative"
          : "cursor-default",
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "bg-gray-100 dark:bg-nb-gray-800 text-gray-600 dark:text-nb-gray-100 rounded-md flex items-center justify-center font-medium relative",
          "uppercase",
          size === "md" ? "h-10 w-10 text-md" : "h-12 w-12 text-lg",
          "shrink-0",
        )}
      >
        {name.substring(0, 2)}
        <div
          className={cn(
            "h-2 w-2 rounded-full absolute bottom-0 right-0 z-10",
            active ? "bg-green-500" : "bg-gray-400 dark:bg-nb-gray-700",
          )}
        ></div>
        <div
          className={cn(
            "h-3 w-3 bg-default rounded-tl-[8px] rounded-br absolute bottom-0 right-0 transition-all",
            onClick && "group-hover/network:bg-gray-100 dark:group-hover/network:bg-nb-gray-910",
            onClick && "group-hover/table-row:bg-gray-50 dark:group-hover/table-row:bg-nb-gray-940",
          )}
        ></div>
      </div>
      <div className={"mt-[0px] flex items-center flex-wrap"}>
        <TruncatedText
          className={cn(
            "font-medium text-gray-800 dark:text-white text-left",
            size == "md" ? "text-sm" : "text-xl leading-none mb-0.5",
          )}
          maxChars={24}
          text={name}
        />
        <TruncatedText
          className={cn(
            "text-left text-sm text-gray-500 dark:text-nb-gray-400",
            size == "lg" && "text-md mt-0.5",
          )}
          maxChars={24}
          text={description}
        />
      </div>
      {onClick && (
        <div
          className={
            "absolute right-0 top-0 h-full flex items-center pr-4 text-gray-500 dark:text-nb-gray-200 opacity-0 group-hover/network:opacity-100"
          }
        >
          <ArrowRightIcon size={18} />
        </div>
      )}
    </button>
  );
};
