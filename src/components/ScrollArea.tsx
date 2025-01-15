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
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    {withoutViewport ? (
      children
    ) : (
      <ScrollAreaViewport>{children}</ScrollAreaViewport>
    )}
    <ScrollBar orientation="horizontal" />
    <ScrollBar orientation="vertical" />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollAreaViewport = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.Viewport
    ref={ref}
    className={cn("h-full w-full rounded-[inherit]", className)}
    {...props}
  />
));
ScrollAreaViewport.displayName = ScrollAreaPrimitive.Viewport.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex select-none touch-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 p-[1px]",
      orientation === "horizontal" && "w-full h-2.5 p-[1px] bottom-0",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative rounded-full bg-neutral-200 dark:bg-nb-gray-800",
        orientation === "vertical" && "flex-1",
        orientation === "horizontal" && "h-full",
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
