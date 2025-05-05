import { cn } from "@utils/helpers";
import { InfoIcon } from "lucide-react";
import * as React from "react";

type Props = {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export const Callout = ({
  children,
  icon = <InfoIcon size={14} className={"shrink-0 relative top-[1px]"} />,
  className,
}: Props) => {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-md border text-sm font-normal flex gap-3",
        "bg-nb-gray-900/60 border-nb-gray-800/80 text-nb-gray-300",
        className,
      )}
    >
      {icon}
      <div>{children}</div>
    </div>
  );
};
