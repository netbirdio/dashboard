import * as React from "react";
import Skeleton from "react-loading-skeleton";

export const SkeletonDeviceCard = () => {
  return (
    <div className={"min-h-[59px] relative -left-2"}>
      <div className={"py-2 pr-4 pl-2 flex gap-3"}>
        <Skeleton height={36} width={36} />
        <div className={"flex flex-col pr-[1.15rem]"}>
          <Skeleton height={16} width={70} />
          <Skeleton height={16} width={140} />
        </div>
      </div>
    </div>
  );
};
