import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import { InfoIcon } from "lucide-react";
import * as React from "react";

type CalloutVariants = VariantProps<typeof calloutVariants>;

type Props = {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
} & CalloutVariants;

export const calloutVariants = cva(
  ["px-4 py-3.5 rounded-md border text-sm font-normal flex gap-3 font-light"],
  {
    variants: {
      variant: {
        default: "bg-nb-gray-900/60 border-nb-gray-800/80 text-nb-gray-300",
        warning: "bg-netbird-500/10 border-netbird-400/20 text-netbird-150",
        info: "bg-sky-400/10 border-sky-400/20 text-sky-100",
      },
    },
  },
);

export const Callout = ({
  children,
  icon = <InfoIcon size={14} className={"shrink-0 relative top-[3px]"} />,
  className,
  variant = "default",
}: Props) => {
  return (
    <div className={cn(calloutVariants({ variant }), className)}>
      {icon}
      <div>{children}</div>
    </div>
  );
};
