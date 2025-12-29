"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@utils/helpers";
import * as React from "react";
import { TooltipVariants, tooltipVariants } from "./Tooltip";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> &
    TooltipVariants
>(
  (
    {
      className = "px-4 py-2.5",
      sideOffset = 7,
      side = "top",
      variant = "default",
      ...props
    },
    ref,
  ) => (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        ref={ref}
        asChild={true}
        side={side}
        sideOffset={sideOffset}
        className={cn(tooltipVariants({ variant }), className)}
        {...props}
      >
        <div>{props.children}</div>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  ),
);
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardContent, HoverCardTrigger };
