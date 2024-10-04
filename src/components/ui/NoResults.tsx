import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { FilterX } from "lucide-react";
import React from "react";
import Skeleton from "react-loading-skeleton";

type Props = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};
export default function NoResults({
  icon,
  title = "Could not find any results",
  description = "We couldn't find any results. Please try a different search term or change your filters.",
  children,
  className,
}: Props) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className={
          "absolute z-20 bg-gradient-to-b dark:to-nb-gray-950 dark:from-nb-gray-950/70 w-full h-full overflow-hidden top-0"
        }
      ></div>
      <div
        className={
          "absolute w-full h-full left-0 top-0 z-10 px-5 overflow-hidden py-4"
        }
      >
        <div className={"flex flex-col gap-2"}>
          <Skeleton className={"w-full"} height={70} duration={4} />
          <Skeleton className={"w-full"} height={70} duration={4} />
          <Skeleton className={"w-full"} height={70} duration={4} />
        </div>
      </div>
      <div className={cn("max-w-md mx-auto relative z-20 py-6")}>
        <div
          className={
            "mx-auto w-14 h-14 bg-nb-gray-930 flex items-center justify-center mb-3 rounded-md"
          }
        >
          {icon ? icon : <FilterX size={24} />}
        </div>
        <div className={"text-center"}>
          <h1 className={"text-2xl font-medium max-w-lg mx-auto"}>{title}</h1>
          <Paragraph className={"justify-center my-2 !text-nb-gray-400"}>
            {description}
          </Paragraph>
          {children}
        </div>
      </div>
    </div>
  );
}
