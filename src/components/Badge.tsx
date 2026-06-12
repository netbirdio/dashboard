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
      blueDark: [
        "bg-sky-100 border-sky-500 text-sky-800 border dark:bg-sky-900 dark:text-white",
      ],
      "blue-darker": [
        "bg-sky-100 border-sky-500 text-sky-800 border dark:bg-sky-900 dark:text-white",
      ],
      red: [
        "bg-red-100 border-red-500 border text-red-700 dark:bg-red-950/40 dark:text-red-500",
      ],
      purple: [
        "bg-purple-100 border-purple-500 border text-purple-700 dark:bg-purple-950/50 dark:text-purple-500",
      ],
      yellow: [
        "bg-yellow-100 border-yellow-500 border text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
      ],
      gray: [
        "bg-white border-nb-gray-700 text-nb-gray-300 border",
        "dark:bg-nb-gray-930/60 dark:border-nb-gray-800/40",
      ],
      lightGray: [
        "bg-white border-nb-gray-700 text-nb-gray-200 border",
        "dark:bg-nb-gray-910 dark:border-nb-gray-900",
      ],
      grayer: [
        "bg-white border-nb-gray-700 text-nb-gray-300 border",
        "dark:bg-nb-gray-900/40 dark:border-nb-gray-800/40",
      ],
      "gray-ghost": [
        "bg-white border-nb-gray-700 text-nb-gray-300 border",
        "dark:bg-nb-gray-900 dark:border-nb-gray-800/50",
      ],
      green: [
        "bg-green-100 border-green-500 border text-green-700 dark:bg-green-950 dark:text-green-400",
      ],
      netbird: [
        "bg-netbird-100 border-netbird-500 border text-netbird-700 dark:bg-netbird-950 dark:text-netbird-500",
      ],
    },
    size: {
      default: "text-[0.75rem] py-1.5 px-3",
      xs: "text-[0.6rem] py-[0.3rem] px-2",
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
      lightGray: ["hover:bg-nb-gray-900"],
      grayer: ["hover:bg-nb-gray-900"],
      "gray-ghost": ["hover:bg-nb-gray-800 cursor-pointer"],
      green: ["hover:bg-green-950/50"],
      netbird: ["hover:bg-netbird-950/50"],
    },
  },
});

export default function Badge({
  children,
  className,
  variant = "blue",
  size = "default",
  useHover = false,
  disabled = false,
  ...props
}: Readonly<Props>) {
  return (
    <div
      className={cn(
        "relative z-10 cursor-inherit whitespace-nowrap rounded-md font-normal flex gap-1.5 items-center justify-center transition-all",
        variants({ variant, hover: useHover ? variant : "none", size }),
        disabled && "cursor-not-allowed opacity-50 select-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
