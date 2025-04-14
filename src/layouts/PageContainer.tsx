import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};
export default function PageContainer({ children, className }: Props) {
  return (
    <div
      className={cn(
        className,
        "relative flex-auto overflow-auto dark:bg-nb-gray bg-white z-1",
        "focus:outline-none",
      )}
    >
      {children}
    </div>
  );
}
