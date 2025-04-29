import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import * as React from "react";

export type BadgeVariants = VariantProps<typeof variants>;

interface Props extends React.HTMLAttributes<HTMLDivElement>, BadgeVariants {
  children: React.ReactNode;
  className?: string;
  useHover?: boolean;
}

const variants = cva("", {
  variants: {
    variant: {
      blue: [
        "bg-sky-100 border-sky-500 text-sky-800 border border-transparent",
      ],
      blueDark: ["bg-sky-100 border-sky-600 text-sky-800 border dark:bg-sky-900 dark:border-sky-500 dark:text-white"],
      "blue-darker": ["bg-sky-100 border-sky-600 text-sky-800 border dark:bg-sky-900 dark:border-sky-500 dark:text-white"],
      red: ["bg-red-100 border-red-400 text-red-600 border dark:bg-red-950/40 dark:border-red-500 dark:text-red-500"],
      purple: ["bg-purple-100 border-purple-400 text-purple-600 border dark:bg-purple-950/50 dark:border-purple-500 dark:text-purple-500"],
      yellow: ["bg-yellow-100 border-yellow-400 text-yellow-600 border dark:bg-yellow-950 dark:border-yellow-500 dark:text-yellow-400"],
      gray: ["bg-gray-100 border-gray-300 text-gray-600 border dark:bg-nb-gray-930/60 dark:border-nb-gray-800/40 dark:text-nb-gray-300"],
      grayer: [
        "bg-gray-100 border-gray-300 text-gray-600 border dark:bg-nb-gray-900/40 dark:border-nb-gray-800/40 dark:text-nb-gray-300",
      ],
      "gray-ghost": [
        "bg-gray-50 border-gray-200 text-gray-500 border dark:bg-nb-gray-900 dark:border-nb-gray-800 dark:text-nb-gray-300 dark:border-nb-gray-800/50",
      ],
      green: ["bg-green-100 border-green-400 text-green-600 border dark:bg-green-950 dark:border-green-500 dark:text-green-400"],
      netbird: ["bg-netbird-100 border-netbird-400 text-netbird-600 border dark:bg-netbird-950 dark:border-netbird-500 dark:text-netbird-500"],
    },
    hover: {
      none: [],
      blue: ["hover:bg-sky-200 dark:hover:bg-sky-800"],
      purple: ["hover:bg-purple-200 dark:hover:bg-purple-950/40"],
      yellow: ["hover:bg-yellow-200 dark:hover:bg-yellow-950/40"],
      blueDark: ["hover:bg-sky-200 dark:hover:bg-sky-800"],
      "blue-darker": ["hover:bg-sky-200 dark:hover:bg-sky-800"],
      red: ["hover:bg-red-200 dark:hover:bg-red-950/40"],
      gray: ["hover:bg-gray-200 dark:hover:bg-nb-gray-900"],
      grayer: ["hover:bg-gray-200 dark:hover:bg-nb-gray-900"],
      "gray-ghost": ["hover:bg-gray-100 dark:hover:bg-nb-gray-900"],
      green: ["hover:bg-green-200 dark:hover:bg-green-950/50"],
      netbird: ["hover:bg-netbird-200 dark:hover:bg-netbird-950/50"],
    },
  },
});

export default function Badge({
  children,
  className,
  variant = "blue",
  useHover = false,
  ...props
}: Readonly<Props>) {
  return (
    <div
      className={cn(
        "relative z-10 cursor-inherit whitespace-nowrap rounded-md text-[12px] py-1.5 px-3 font-normal flex gap-1.5 items-center justify-center transition-all",
        className,
        variants({ variant, hover: useHover ? variant : "none" }),
      )}
      {...props}
    >
      {children}
    </div>
  );
}
