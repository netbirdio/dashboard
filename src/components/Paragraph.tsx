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
        "dark:text-gray-400 text-nb-gray-500 text-base flex flex-wrap gap-x-1.5",
        className,
      )}
    >
      {children}
    </p>
  );
}
