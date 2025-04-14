import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const smallBadgeVariants = cva("", {
  variants: {
    variant: {
      green: "border border-green-500/20 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400",
      white: "bg-white/20 border border-white/10 text-white",
      sky: "bg-sky-900 border border-sky-500/20 text-white",
    },
  },
});

type Props = {
  text?: string;
  className?: string;
  children?: React.ReactNode;
} & VariantProps<typeof smallBadgeVariants>;

export const SmallBadge = ({
  text = "NEW",
  className,
  variant = "green",
  children,
}: Props) => {
  return (
    <span
      className={cn(
        smallBadgeVariants({ variant }),
        "text-[7px] relative -top-[.25px] leading-[0] py-[0.39rem] px-1 rounded-[3px]",
        className,
      )}
    >
      {children}
      <span className={"relative top-[0.4px]"}>{text}</span>
    </span>
  );
};
