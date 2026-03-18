import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { cn } from "@utils/helpers";

type Props = {
  className?: string;
};

export const SkeletonDeviceCard = ({ className = "min-h-[59px]" }: Props) => {
  return (
    <div
      className={cn("py-2 pr-4 pl-2 flex gap-3 relative -left-2", className)}
    >
      <Skeleton height={36} width={36} />
      <div className={"flex flex-col pr-[1.15rem]"}>
        <Skeleton height={16} width={70} />
        <Skeleton height={16} width={140} />
      </div>
    </div>
  );
};
