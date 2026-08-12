import { PropsWithChildren } from "react";
import { cn } from "@utils/helpers";

export const ToolbarContainer = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => {
  return (
    <div
      className={cn(
        "flex items-stretch bg-nb-gray-930 border border-nb-gray-900 rounded-lg",
        className,
      )}
    >
      {children}
    </div>
  );
};
