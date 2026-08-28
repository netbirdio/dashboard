import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const smallBadgeVariants = cva("", {
  variants: {
    variant: {
      green:
        "bg-green-100 border border-green-300 text-green-700 dark:bg-green-900 dark:border-green-500/20 dark:text-green-400",
      blue: "bg-blue-100 border border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-500/20 dark:text-blue-400",
      white: "bg-white/20 border border-white/10 text-white",
      sky: "bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-900 dark:border-sky-500/20 dark:text-white",
      netbird:
        "bg-netbird-100 border border-netbird-400 text-netbird-700 dark:bg-netbird-900 dark:text-netbird-300",
      yellow:
        "bg-yellow-100 border border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-500/20 dark:text-yellow-400",
    },
    size: {
      default:
        "text-[0.4rem] relative -top-[.25px] leading-[0] py-[0.39rem] px-1 rounded-[3px]",
      md: "text-[0.55rem] relative -top-[.25px] leading-[0] py-[0.45rem] px-1 rounded-[3px]",
    },
  },
});

type Props = {
  text?: string;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
} & VariantProps<typeof smallBadgeVariants>;

export const SmallBadge = ({
  text = "NEW",
  className,
  textClassName,
  variant = "green",
  children,
  size = "default",
}: Props) => {
  return (
    <span className={cn(smallBadgeVariants({ variant, size }), className)}>
      {children}
      <span className={cn("relative top-[0.4px]", textClassName)}>{text}</span>
    </span>
  );
};
