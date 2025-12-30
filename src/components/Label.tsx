"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const labelVariants = cva(
  "text-sm font-medium tracking-wider leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 inline-block dark:text-nb-gray-200 flex items-center gap-2",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className, "select-none")}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
