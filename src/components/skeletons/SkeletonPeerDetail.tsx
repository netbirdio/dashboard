import Skeleton from "react-loading-skeleton";

export default function SkeletonPeerDetail() {
  return (
    <div className={"w-full mt-6 p-default"}>
      <div className={"flex flex-wrap w-full justify-between max-w-6xl "}>
        <Skeleton height={24} width={300} className={"rounded-md"} />
      </div>
      <div className={"flex flex-wrap w-full justify-between mt-4 max-w-6xl "}>
        <Skeleton height={42} width={400} className={"rounded-md"} />
        <div className={"flex gap-3"}>
          <Skeleton height={42} width={80} className={"rounded-md"} />
          <Skeleton height={42} width={120} className={"rounded-md"} />
        </div>
      </div>
      <div
        className={
          "flex flex-wrap w-full justify-between mt-6 max-w-6xl gap-10"
        }
      >
        <Skeleton
          height={400}
          width={"100%"}
          className={"rounded-md"}
          containerClassName={"flex-1 "}
        />
        <Skeleton
          height={300}
          width={"100%"}
          className={"rounded-md opacity-30"}
          containerClassName={"flex-1 "}
        />
      </div>
    </div>
  );
}
