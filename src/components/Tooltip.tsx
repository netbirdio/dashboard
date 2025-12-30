"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

export type TooltipVariants = VariantProps<typeof tooltipVariants>;

export const tooltipVariants = cva(
  [
    "z-[9999] overflow-hidden rounded-md border text-sm shadow-md",
    "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-nb-gray-940",
          "text-neutral-50",
          "border-neutral-200 border-nb-gray-930",
        ],
        lighter: [
          "bg-nb-gray-920",
          "text-neutral-50",
          "border-neutral-200 border-nb-gray-900",
        ],
      },
    },
  },
);

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    TooltipVariants
>(
  (
    {
      className = "px-4 py-2.5",
      sideOffset = 7,
      variant = "default",
      ...props
    },
    ref,
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        asChild={true}
        sideOffset={sideOffset}
        className={cn(tooltipVariants({ variant }), className)}
        {...props}
      >
        <div>{props.children}</div>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
