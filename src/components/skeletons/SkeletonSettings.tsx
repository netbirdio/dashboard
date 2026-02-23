import * as React from "react";
import Skeleton from "react-loading-skeleton";

export const SkeletonSettings = () => {
  return (
    <div className={"p-default py-6 max-w-2xl"}>
      <Skeleton height={24} width={200} className={"mb-6"} />
      <Skeleton height={32} width={110} className={"mb-10"} />
      <div className={"mb-8"}>
        <Skeleton height={17} width={200} className={"mb-2"} />
        <Skeleton height={80} width={"100%"} />
      </div>
      <div className={"mb-8"}>
        <Skeleton height={17} width={200} className={"mb-2"} />
        <Skeleton height={80} width={"100%"} />
      </div>
      <Skeleton height={80} width={"100%"} />
    </div>
  );
};
