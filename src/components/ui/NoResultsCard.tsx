import Card from "@components/Card";
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

export default function NoResultsCard({
  icon,
  title = "Could not find any results",
  description = "We couldn't find any results. Please try a different search term or change your filters.",
  children,
  className,
}: Readonly<Props>) {
  return (
    <div className={cn("px-8 mt-8", className)}>
      <Card className={"w-full relative overflow-hidden"}>
        <div
          className={
            "absolute z-20 bg-gradient-to-b  dark:to-nb-gray-950 dark:from-nb-gray-950/40 w-full h-full"
          }
        ></div>
        <div
          className={
            "absolute w-full h-full left-0 top-0 z-10 px-5 py-3 overflow-hidden"
          }
        >
          <div className={"flex flex-col gap-2"}>
            <Skeleton className={"w-full"} height={70} duration={4} />
            <Skeleton className={"w-full"} height={70} duration={4} />
            <Skeleton className={"w-full"} height={70} duration={4} />
            <Skeleton className={"w-full"} height={70} duration={4} />
            <Skeleton className={"w-full"} height={70} duration={4} />
          </div>
        </div>
        <div className={"max-w-md mx-auto relative z-20 py-8"}>
          <div
            className={
              "mx-auto w-10 h-10 bg-nb-gray-930 flex items-center justify-center mb-3 rounded-md border border-nb-gray-800"
            }
          >
            {icon || <FilterX size={24} />}
          </div>
          <div className={"text-center"}>
            <h1 className={"text-2xl font-medium max-w-lg mx-auto"}>{title}</h1>
            <Paragraph className={"justify-center my-2 !text-nb-gray-400"}>
              {description}
            </Paragraph>
            {children}
          </div>
        </div>
      </Card>
    </div>
  );
}
