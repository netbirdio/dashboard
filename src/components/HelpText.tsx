import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children?: React.ReactNode;
  margin?: boolean;
  className?: string;
  id?: string;
};
export default function HelpText({
  children,
  margin = true,
  className,
  id,
}: Props) {
  return (
    <span
      id={id}
      className={cn(
        "text-[.8rem] dark:text-nb-gray-300 block font-light tracking-wide",
        margin && "mb-2",
        className,
      )}
    >
      {children}
    </span>
  );
}
