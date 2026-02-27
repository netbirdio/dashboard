import * as React from "react";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import SkeletonTable from "@components/skeletons/SkeletonTable";

export const SkeletonNetwork = ({ delay = 400 }: { delay?: number }) => {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div className={"p-default py-6 w-full"}>
      <Skeleton height={24} width={240} className={"mb-4"} />
      <div className={"mb-8 flex items-center gap-4"}>
        <Skeleton height={48} width={48} />
        <Skeleton height={20} width={200} />
      </div>
      <div className={"mb-4"}>
        <Skeleton height={106} className={"mb-2 w-full max-w-[574px]"} />
      </div>
      <div className={"flex items-center gap-4 mb-8"}>
        <Skeleton height={24} width={130} />
        <Skeleton height={24} width={130} />
        <Skeleton height={24} width={130} />
      </div>

      <div>
        <Skeleton height={16} width={530} className={"w-full max-w-[530px]"} />
        <Skeleton height={16} width={430} className={"w-full max-w-[430px]"} />
      </div>
      <div className={"w-full"}>
        <SkeletonTable withHeader={false} />
      </div>
    </div>
  );
};
