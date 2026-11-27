import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

const pillVariants = cva(
  "flex items-center gap-3 bg-nb-gray-900/80 border border-nb-gray-800/50 rounded-full transition-all",
  {
    variants: {
      size: {
        // 32px circles, e.g. the checks of a posture check.
        default: "py-1 px-1",
        // 20px circles, e.g. the flags of an exit node's locations.
        sm: "p-[3px]",
      },
      hover: {
        true: "hover:bg-nb-gray-800",
        false: "",
      },
    },
    defaultVariants: { size: "default", hover: true },
  },
);

const stackVariants = cva("flex text-white dark:text-inherit", {
  variants: {
    size: {
      default: "-space-x-2",
      sm: "-space-x-1.5",
    },
  },
  defaultVariants: { size: "default" },
});

type Props = {
  // The overlapping circles, front first.
  circles: React.ReactNode;
  // Shown after the circles, inside the pill.
  children?: React.ReactNode;
  disableHover?: boolean;
  className?: string;
  onClick?: () => void;
} & Pick<VariantProps<typeof pillVariants>, "size">;

/**
 * A rounded pill with a row of overlapping circles, like the checks of a
 * posture check or the flags of an exit node.
 */
export const CircleStackPill = ({
  circles,
  children,
  disableHover = false,
  className,
  onClick,
  size,
}: Props) => {
  return (
    <div className={"flex"} onClick={onClick}>
      <div
        className={cn(pillVariants({ size, hover: !disableHover }), className)}
      >
        <div className={stackVariants({ size })}>{circles}</div>
        {children}
      </div>
    </div>
  );
};
