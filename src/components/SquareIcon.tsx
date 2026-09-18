import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

const iconVariant = cva(
  "rounded-md flex items-center justify-center border shadow-sm shrink-0",
  {
    variants: {
      color: {
        netbird:
          "bg-netbird-100 border-netbird text-netbird-700 dark:bg-netbird-950 dark:text-netbird",
        blue: "bg-sky-100 border-sky-500 text-sky-700 dark:bg-sky-950 dark:text-sky-100",
        "blue-darker":
          "bg-sky-100 border-sky-500 text-sky-700 dark:bg-sky-950 dark:text-sky-500",
        red: "bg-red-100 border-red-500 text-red-700 dark:bg-red-950 dark:text-red-500",
        gray: "bg-nb-gray-930 border-nb-gray-800 text-gray-500",
        green:
          "bg-green-100 border-green-500 text-green-700 dark:bg-green-950 dark:text-green-500",
        purple:
          "bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-950 dark:text-purple-500",
        indigo:
          "bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-500",
        yellow:
          "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
      },
      size: {
        small: "w-8 h-8",
        medium: "w-10 h-10",
        large: "w-12 h-12",
      },
    },
  },
);

export type IconVariant = VariantProps<typeof iconVariant>;
interface Props extends IconVariant {
  icon: React.ReactNode;
  margin?: string;
  rounded?: boolean;
}

export default function SquareIcon({
  color = "netbird",
  icon,
  size = "medium",
  margin = "mt-1",
  rounded = false,
}: Props) {
  return (
    <div
      className={cn(
        iconVariant({
          color,
          size,
        }),
        margin,
        rounded && "rounded-full",
      )}
    >
      {icon}
    </div>
  );
}
