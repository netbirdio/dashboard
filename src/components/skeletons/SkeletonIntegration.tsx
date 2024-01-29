import * as React from "react";
import Skeleton from "react-loading-skeleton";

type Props = {
  loadingHeight?: number;
};
export const SkeletonIntegration = ({ loadingHeight = 147 }: Props) => {
  return (
    <Skeleton
      className={
        "rounded-lg top-0 relative border border-nb-gray-900/50 flex flex-col"
      }
      height={loadingHeight}
      width={360}
      containerClassName={"flex"}
    />
  );
};
