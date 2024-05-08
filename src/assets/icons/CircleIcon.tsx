import { cn } from "@utils/helpers";
import React from "react";

type Props = {
  active?: boolean;
  size?: number;
  inactiveDot?: "gray" | "red";
  className?: string;
};
export default function CircleIcon({
  active,
  size = 11,
  inactiveDot = "gray",
  className,
}: Props) {
  return (
    <span
      style={{ width: size + "px", height: size + "px" }}
      data-cy="circle-icon"
      data-cy-status={active ? "active" : "inactive"}
      className={cn(
        "rounded-full",
        active
          ? "bg-green-400"
          : inactiveDot == "gray"
          ? "bg-nb-gray-500"
          : "bg-red-500",
        className,
      )}
    ></span>
  );
}
