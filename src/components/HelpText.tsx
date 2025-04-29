import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children?: React.ReactNode;
  margin?: boolean;
  className?: string;
};
export default function HelpText({
  children,
  margin = true,
  className,
}: Props) {
  return (
    <span
      className={cn(
        "text-[.8rem] text-gray-500 dark:text-nb-gray-300 block font-light tracking-wide",
        margin && "mb-2",
        className,
      )}
    >
      {children}
    </span>
  );
}
