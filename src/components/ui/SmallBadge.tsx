import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const smallBadgeVariants = cva("", {
  variants: {
    variant: {
      green: "bg-green-900 border border-green-500/20 text-green-400",
      blue: "bg-blue-900 border border-blue-500/20 text-blue-400",
      white: "bg-white/20 border border-white/10 text-white",
      sky: "bg-sky-900 border border-sky-500/20 text-white",
      netbird: "bg-netbird-900 border border-netbird-400 text-netbird-300",
      yellow: "bg-yellow-900 border border-yellow-500/20 text-yellow-400",
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
