import * as React from "react";
import Skeleton from "react-loading-skeleton";
import SkeletonTable from "@components/skeletons/SkeletonTable";

export const SkeletonNetwork = () => {
  return (
    <div className={"p-default py-6 w-full"}>
      <Skeleton height={24} width={240} className={"mb-4"} />
      <div className={"mb-8 flex items-center gap-4"}>
        <Skeleton height={48} width={48} />
        <Skeleton height={20} width={200} />
      </div>
      <div className={"mb-4"}>
        <Skeleton height={106} width={574} className={"mb-2"} />
      </div>
      <div className={"flex items-center gap-4 mb-8"}>
        <Skeleton height={24} width={130} />
        <Skeleton height={24} width={130} />
        <Skeleton height={24} width={130} />
      </div>

      <div>
        <Skeleton height={16} width={530} />
        <Skeleton height={16} width={430} />
      </div>
      <div className={"w-full"}>
        <SkeletonTable withHeader={false} />
      </div>
    </div>
  );
};
