import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};
export default function SmallParagraph({ children, className }: Props) {
  return (
    <p
      className={cn(
        "text-[.85rem] text-gray-500 dark:text-nb-gray-400",
        className,
      )}
    >
      {children}
    </p>
  );
}
