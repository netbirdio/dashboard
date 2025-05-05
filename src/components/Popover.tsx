"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

type PopoverVariants = VariantProps<typeof popoverVariants>;

export const popoverVariants = cva([], {
  variants: {
    variant: {
      lighter: [
        "rounded-md border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-950 shadow-md",
        "dark:border-nb-gray-800 dark:bg-nb-gray-920 dark:text-neutral-50",
      ],
      dark: [
        "rounded-md border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-950 shadow-md",
        "dark:border-nb-gray-900 dark:bg-nb-gray-940 dark:text-gray-50",
      ],
    },
  },
});

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> &
    PopoverVariants
>(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      variant = "lighter",
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          popoverVariants({ variant }),
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverContent, PopoverTrigger };
