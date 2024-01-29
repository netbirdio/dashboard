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
    <p
      className={cn(
        "text-[.8rem] dark:text-nb-gray-300",
        margin && "mb-2",
        className,
      )}
    >
      {children}
    </p>
  );
}
