import * as React from "react";
import { cn } from "@utils/helpers";

export const ListItem = ({
  icon,
  label,
  value,
  className,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(" border-b border-nb-gray-920  last:border-b-0", className)}
    >
      <div className={cn("flex justify-between gap-12 py-2 px-4")}>
        <div className={"flex items-center gap-2 text-nb-gray-100 font-medium"}>
          {icon}
          {label}
        </div>
        <div className={"text-nb-gray-300"}>{value}</div>
      </div>
      {children}
    </div>
  );
};
