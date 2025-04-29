import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import React from "react";

type BadgeVariants = VariantProps<typeof variants>;

interface Props extends React.HTMLAttributes<HTMLDivElement>, BadgeVariants {
  children: React.ReactNode;
}

const variants = cva("", {
  variants: {
    variant: {
      default: ["bg-gray-200 border-gray-300 text-gray-700 dark:bg-nb-gray-800 dark:border-nb-gray-700 dark:text-nb-gray-300"],
      netbird: ["bg-netbird-100 text-netbird border-netbird "],
    },
    size: {
      default: ["py-2.5 px-1.5 text-xs h-[12px]"],
      small: ["py-[9px] px-2 text-[9px] h-[12px] leading-[0]"],
    },
    disabled: {
      true: ["bg-gray-100 border-gray-200 text-gray-400 dark:bg-nb-gray-800 dark:border-nb-gray-700 dark:text-nb-gray-300"],
    },
  },
});

export default function Kbd({
  children,
  variant = "default",
  size = "default",
  disabled = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        " shadow-sm border rounded-[4px]  leading-[0] flex gap-1 items-center",
        variants({ variant, size, disabled }),
        className,
      )}
    >
      {children}
    </div>
  );
}
