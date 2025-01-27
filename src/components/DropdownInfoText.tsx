import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const DropdownInfoText = ({ children, className }: Props) => {
  return (
    <div className={cn("text-center pt-2 mb-6 text-nb-gray-400", className)}>
      {children}
    </div>
  );
};
