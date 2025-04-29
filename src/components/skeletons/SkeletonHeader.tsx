export default function SkeletonHeader() {
  return (
    <div className={"flex flex-col gap-4 max-w-3xl"}>
      <div className={"h-[16px] bg-gray-200 dark:bg-nb-gray-930 w-[100px] rounded-full"}></div>
      <div className={"flex gap-2 flex-col"}>
        <div className={"h-[30px] bg-gray-200 dark:bg-nb-gray-930 w-[170px] rounded-md"}></div>
        <div className={"h-[10px] bg-gray-200 dark:bg-nb-gray-930 w-[540px] rounded-full"}></div>
        <div className={"h-[10px] bg-gray-200 dark:bg-nb-gray-930 w-[340px] rounded-full"}></div>
      </div>
      <div className={"flex gap-2 flex-col mt-6"}>
        <div
          className={"h-[40px] bg-gray-200 dark:bg-nb-gray-930/50 w-[400px] rounded-md"}
        ></div>
        <div
          className={"h-[40px] bg-gray-200 dark:bg-nb-gray-930/50 w-[140px] rounded-md"}
        ></div>
        <div
          className={"h-[40px] bg-gray-200 dark:bg-nb-gray-930/50 w-[180px] rounded-md"}
        ></div>
        <div className={"h-[40px] bg-gray-200 dark:bg-nb-gray-930/50 w-[60px] rounded-md"}></div>
      </div>
    </div>
  );
}
