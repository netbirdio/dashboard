"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const labelVariants = cva(
  "text-sm font-medium tracking-wider leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 inline-block dark:text-nb-gray-200 flex items-center gap-2",
);

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants> & {
    as?: "label" | "div";
  };

const Label = React.forwardRef<HTMLElement, LabelProps>(
  ({ className, as = "label", children, ...props }, ref) => {
    const classes = cn(labelVariants(), className, "select-none");

    if (as === "div") {
      return (
        <div ref={ref as React.Ref<HTMLDivElement>} className={classes}>
          {children}
        </div>
      );
    }

    return (
      <LabelPrimitive.Root
        ref={ref as React.Ref<HTMLLabelElement>}
        className={classes}
        {...props}
      >
        {children}
      </LabelPrimitive.Root>
    );
  },
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
