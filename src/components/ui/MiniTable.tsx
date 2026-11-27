import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** A small bordered table inside a modal, e.g. the policies of a resource. */
export const MiniTable = ({
  children,
  className,
  "aria-label": ariaLabel,
}: Props) => (
  <div
    className={cn(
      "mt-3 mb-3 overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1 rounded-md",
      className,
    )}
  >
    <table className="w-full" aria-label={ariaLabel}>
      {children}
    </table>
  </div>
);

type HeadProps = {
  children?: React.ReactNode;
  // Padding of the column, e.g. "px-4".
  className?: string;
};

export const MiniTableHead = ({ children, className }: HeadProps) => (
  <th
    className={cn(
      "py-2 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium",
      className,
    )}
  >
    {children}
  </th>
);
