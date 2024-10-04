"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@utils/helpers";
import * as React from "react";

type AdditionalScrollAreaProps = {
  withoutViewport?: boolean;
};

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> &
    AdditionalScrollAreaProps
>(({ className, children, withoutViewport = false, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn(
      "relative will-change-scroll webkit-scroll",
      className,
      "overflow-hidden",
    )}
    {...props}
  >
    {withoutViewport ? (
      children
    ) : (
      <ScrollAreaViewport disableOverflowY={false}>
        {children}
      </ScrollAreaViewport>
    )}
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

type AdditionalScrollAreaViewportProps = {
  disableOverflowY?: boolean;
};

const ScrollAreaViewport = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport> &
    AdditionalScrollAreaViewportProps
>(({ disableOverflowY = true, ...props }, ref) => {
  return (
    <ScrollAreaPrimitive.Viewport
      ref={ref}
      className="h-full w-full rounded-[inherit] will-change-scroll webkit-scroll"
      {...props}
      style={
        disableOverflowY ? { overflowY: undefined, ...props.style } : undefined
      }
    />
  );
});
ScrollAreaViewport.displayName = ScrollAreaPrimitive.Viewport.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    style={{ boxSizing: "unset", overflow: undefined }}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative rounded-full bg-neutral-200 dark:bg-nb-gray-800",
        orientation === "vertical" && "flex-1",
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

const MemoizedScrollArea = React.memo(ScrollArea);
const MemoizedScrollAreaViewport = React.memo(ScrollAreaViewport);
const MemoizedScrollBar = React.memo(ScrollBar);

export {
  MemoizedScrollArea,
  MemoizedScrollAreaViewport,
  MemoizedScrollBar,
  ScrollArea,
  ScrollAreaViewport,
  ScrollBar,
};
