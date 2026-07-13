import * as React from "react";
import { cn } from "@utils/helpers";
import FullTooltip from "@components/FullTooltip";

interface ToolbarButtonProps {
  children: React.ReactNode;
  tooltip?: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "primary";
  onClick?: () => void;
}

export const ToolbarButton = ({
  children,
  tooltip,
  shortcut,
  active,
  disabled,
  className,
  variant = "default",
  onClick,
}: ToolbarButtonProps) => {
  const button = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 flex items-center justify-center rounded-md transition-colors",
        variant === "default" &&
          "text-nb-gray-300 hover:text-nb-gray-100 hover:bg-nb-gray-800",
        variant === "default" && active && "bg-nb-gray-800 text-nb-gray-100",
        variant === "primary" &&
          "bg-netbird text-white hover:bg-netbird-500 hover:text-white",
        disabled &&
          "text-nb-gray-700 hover:text-nb-gray-700 hover:bg-transparent cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  return (
    <FullTooltip
      content={
        <span className="text-xs flex items-center gap-2">
          {tooltip}
          {shortcut && (
            <kbd className="text-[0.67rem] font-mono text-nb-gray-400 ml-1 relative top-[1px]">
              {shortcut}
            </kbd>
          )}
        </span>
      }
      side="top"
      sideOffset={10}
      interactive={false}
      contentClassName="!px-2 !py-1.5"
      variant={"lighter"}
    >
      {button}
    </FullTooltip>
  );
};
