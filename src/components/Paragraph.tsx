import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};
export default function Paragraph({ children, className }: Props) {
  return (
    <p
      className={cn(
        "text-gray-700 dark:text-gray-400 text-base flex flex-wrap gap-x-1.5",
        className,
      )}
    >
      {children}
    </p>
  );
}
