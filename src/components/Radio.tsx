import * as RadioPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";
import { forwardRef } from "react";

type RadioVariants = VariantProps<typeof variants>;

const variants = cva([], {
  variants: {
    variant: {
      default: [
        "dark:data-[state=unchecked]:bg-nb-gray-950 dark:border-nb-gray-900 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300",
        "dark:data-[state=checked]:bg-netbird",
      ],
    },
  },
});

const Radio = forwardRef<
  React.ElementRef<typeof RadioPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioPrimitive.Root> & RadioVariants
>(
  (
    { className, children, variant = "default", defaultValue, ...props },
    ref,
  ) => (
    <RadioPrimitive.Root
      ref={ref}
      defaultValue={defaultValue}
      name={props.name}
      {...props}
    >
      {children}
    </RadioPrimitive.Root>
  ),
);
Radio.displayName = RadioPrimitive.Root.displayName;

type Props = {
  value: string;
  className?: string;
} & RadioVariants;

const RadioItem = ({ value, className, variant = "default" }: Props) => {
  return (
    <RadioPrimitive.Item
      value={value}
      className={cn(
        variants({ variant }),
        "border-neutral-900",
        "peer h-5 w-5 shrink-0 rounded-full border",
        "ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50 relative",
        className,
      )}
    >
      <RadioPrimitive.Indicator asChild={true}>
        <div
          className={cn(
            "h-2 w-2 bg-netbird absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full",
            "data-[state=checked]:bg-white data-[state=checked]:text-neutral-50 ",
          )}
        ></div>
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Item>
  );
};
RadioItem.displayName = RadioPrimitive.Item.displayName;

export { Radio, RadioItem };
