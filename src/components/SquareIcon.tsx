import { cn } from "@utils/helpers";
import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

const iconVariant = cva(
  "rounded-md flex items-center justify-center border shadow-sm shrink-0",
  {
    variants: {
      color: {
        netbird: "bg-netbird-950 border-netbird text-netbird",
        blue: "bg-sky-950 border-sky-500 text-sky-100",
        "blue-darker": "bg-sky-950 border-sky-500 text-sky-500",
        red: "bg-red-950 border-red-500 text-red-500",
        gray: "bg-nb-gray-930 border-nb-gray-800 text-gray-500",
        green: "bg-green-950 border-green-500 text-green-500",
        purple: "bg-purple-950 border-purple-500 text-purple-500",
        indigo: "bg-indigo-950 border-indigo-500 text-indigo-500",
        yellow: "bg-yellow-950 border-yellow-400 text-yellow-400",
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
