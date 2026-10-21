import { cn } from "@utils/helpers";
import { PropsWithChildren } from "react";

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
