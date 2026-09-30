import { cn } from "@utils/helpers";

export const ToolbarDivider = ({ className }: { className?: string }) => {
  return <div className={cn("w-px bg-nb-gray-900", className ?? "mx-2")} />;
};
