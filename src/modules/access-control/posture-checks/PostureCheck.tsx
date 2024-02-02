import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { PlusIcon } from "lucide-react";
import * as React from "react";

type Props = {
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  description: string;
  onClick?: () => void;
};
export const PostureCheck = ({
  icon,
  iconClass = "bg-nb-gray-800 border-nb-gray-700",
  title,
  description,
  onClick,
}: Props) => {
  return (
    <div
      className={
        "bg-nb-gray-920 pl-3 py-3 pr-4 flex items-center gap-4 rounded-md !text-sm border border-nb-gray-900"
      }
    >
      <div className={"flex-col"}>
        <div className={" flex items-center gap-3"}>
          <div
            className={cn(
              "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
              iconClass,
            )}
          >
            {icon}
          </div>

          <div>
            <div className={"font-normal text-nb-gray-100 text-sm mb-0.5"}>
              {title}
            </div>
            <div className={"text-xs text-nb-gray-300 font-normal"}>
              {description}
            </div>
          </div>
        </div>
      </div>
      <div className={"ml-auto"}>
        <Button variant={"secondary"} size={"xs"} onClick={onClick}>
          <PlusIcon size={14} />
          Add Check
        </Button>
      </div>
    </div>
  );
};
