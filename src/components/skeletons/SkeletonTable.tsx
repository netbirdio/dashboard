import { cn } from "@utils/helpers";
import * as React from "react";
import Skeleton from "react-loading-skeleton";

type Props = {
  withHeader?: boolean;
};

export default function SkeletonTable({ withHeader = true }: Readonly<Props>) {
  return (
    <div className={"w-full"}>
      {withHeader && <SkeletonTableHeader />}
      <div className={"mt-6 relative -top-1"}>
        <TableSkeletonRow />
        <TableSkeletonRow odd />
        <TableSkeletonRow />
        <TableSkeletonRow odd />
        <TableSkeletonRow />
        <TableSkeletonRow odd />
      </div>
    </div>
  );
}

export function TableContentSkeleton() {
  return (
    <div className={"w-full"}>
      <div className={"mt-6"}>
        <TableSkeletonRow />
        <TableSkeletonRow odd />
        <TableSkeletonRow />
        <TableSkeletonRow odd />
        <TableSkeletonRow />
        <TableSkeletonRow odd />
      </div>
    </div>
  );
}

type RowProps = {
  odd?: boolean;
};

export function TableSkeletonRow({ odd = false }: Readonly<RowProps>) {
  return (
    <div
      className={cn(
        odd ? "bg-nb-gray-940/40" : "bg-nb-gray-940",
        "h-[55px] w-full flex items-center px-8 py-2 justify-between gap-10",
      )}
    >
      <Skeleton height={10} width={"100%"} containerClassName={"flex-1"} />
      <Skeleton height={10} width={"100%"} containerClassName={"flex-1"} />
      <Skeleton height={10} width={"100%"} containerClassName={"flex-1"} />
      <Skeleton height={10} width={"100%"} containerClassName={"flex-1"} />
      <Skeleton height={10} width={"100%"} containerClassName={"flex-1"} />
    </div>
  );
}

type SkeletonTableHeaderProps = {
  className?: string;
};

export const SkeletonTableHeader = ({
  className,
}: SkeletonTableHeaderProps) => {
  return (
    <div
      className={cn(
        "flex gap-x-4 gap-y-6 p-default flex-wrap w-full justify-between relative -top-1",
        className,
      )}
    >
      <div className={"flex gap-x-4 gap-y-6"}>
        <Skeleton height={42} width={400} className={"rounded-md"} />
        <Skeleton height={42} width={140} className={"rounded-md"} />
        <Skeleton height={42} width={190} className={"rounded-md"} />
        <Skeleton height={42} width={50} className={"rounded-md"} />
      </div>
      <Skeleton height={42} width={120} className={"rounded-md"} />
    </div>
  );
};
