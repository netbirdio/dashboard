import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

export type BadgeVariants = VariantProps<typeof variants>;

interface Props extends React.HTMLAttributes<HTMLDivElement>, BadgeVariants {
  children: React.ReactNode;
  className?: string;
  useHover?: boolean;
  disabled?: boolean;
}

const variants = cva("", {
  variants: {
    variant: {
      blue: [
        "bg-sky-100 border-sky-500 text-sky-800 border border-transparent",
      ],
      blueDark: ["bg-sky-900 border-sky-500 text-white border"],
      "blue-darker": ["bg-sky-900 border-sky-500 text-white border"],
      red: ["bg-red-950/40 border-red-500 border text-red-500"],
      purple: ["bg-purple-950/50 border-purple-500 border text-purple-500"],
      yellow: ["bg-yellow-950 border-yellow-500 border text-yellow-400"],
      gray: ["bg-nb-gray-930/60 border-nb-gray-800/40 text-nb-gray-300 border"],
      grayer: [
        "bg-nb-gray-900/40 border-nb-gray-800/40 text-nb-gray-300 border",
      ],
      "gray-ghost": [
        "bg-nb-gray-900 border-nb-gray-800 text-nb-gray-300 border border-nb-gray-800/50",
      ],
      green: ["bg-green-950 border-green-500 border text-green-400"],
      netbird: ["bg-netbird-950 border-netbird-500 border text-netbird-500"],
    },
    hover: {
      none: [],
      blue: ["hover:bg-sky-200"],
      purple: ["hover:bg-purple-950/40"],
      yellow: ["hover:bg-yellow-950/40"],
      blueDark: ["hover:bg-sky-800"],
      "blue-darker": ["hover:bg-sky-800"],
      red: ["hover:bg-red-950/40"],
      gray: ["hover:bg-nb-gray-900"],
      grayer: ["hover:bg-nb-gray-900"],
      "gray-ghost": ["hover:bg-nb-gray-900"],
      green: ["hover:bg-green-950/50"],
      netbird: ["hover:bg-netbird-950/50"],
    },
  },
});

export default function Badge({
  children,
  className,
  variant = "blue",
  useHover = false,
  disabled = false,
  ...props
}: Readonly<Props>) {
  return (
    <div
      className={cn(
        "relative z-10 cursor-inherit whitespace-nowrap rounded-md text-[12px] py-1.5 px-3 font-normal flex gap-1.5 items-center justify-center transition-all",
        variants({ variant, hover: useHover ? variant : "none" }),
        disabled && "cursor-not-allowed opacity-50 select-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
