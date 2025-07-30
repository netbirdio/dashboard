import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { FilterX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback } from "react";
import Skeleton from "react-loading-skeleton";

type Props = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  hasFiltersApplied?: boolean;
  onResetFilters?: () => void;
};
export default function NoResults({
  icon,
  title = "Could not find any results",
  description = "We couldn't find any results. Please try a different search term or change your filters.",
  children,
  className,
  hasFiltersApplied = false,
  onResetFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleResetClick = useCallback(() => {
    if (onResetFilters) {
      onResetFilters();

      const params = new URLSearchParams();

      const page_size = searchParams.get("page_size");

      params.set("page", "1");

      if (page_size) {
        params.set("page_size", page_size);
      }

      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl);
    }
  }, [onResetFilters, router, pathname, searchParams]);

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
          {hasFiltersApplied && onResetFilters && (
            <Button
              onClick={handleResetClick}
              variant="secondary"
              className="mt-4"
            >
              <FilterX size={16} />
              Reset Filters & Search
            </Button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
