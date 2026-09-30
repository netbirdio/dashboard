import { PropsWithChildren } from "react";
import { cn } from "@utils/helpers";

interface ToolbarGroupProps {
  compact?: boolean;
  position?: "first" | "middle" | "last";
  className?: string;
}

export const ToolbarGroup = ({
  children,
  compact,
  position,
  className,
}: PropsWithChildren<ToolbarGroupProps>) => {
  return (
    <div
      className={cn(
        "flex items-center py-1",
        compact ? "gap-0" : "gap-1",
        position === "first" && "pl-1",
        position === "last" && "pr-2",
        !position && "px-1",
        className,
      )}
    >
      {children}
    </div>
  );
};
