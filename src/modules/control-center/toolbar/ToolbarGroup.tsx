import { PropsWithChildren } from "react";
import { cn } from "@utils/helpers";

interface ToolbarGroupProps {
  compact?: boolean;
  position?: "first" | "middle" | "last";
}

export const ToolbarGroup = ({
  children,
  compact,
  position,
}: PropsWithChildren<ToolbarGroupProps>) => {
  return (
    <div
      className={cn(
        "flex items-center py-1",
        compact ? "gap-0" : "gap-0.5",
        position === "first" && "pl-1",
        position === "last" && "pr-1",
        !position && "px-1",
      )}
    >
      {children}
    </div>
  );
};
