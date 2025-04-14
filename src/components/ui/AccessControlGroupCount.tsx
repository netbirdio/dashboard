import FullTooltip from "@components/FullTooltip";
import useFetchApi from "@utils/api";
import { uniqBy } from "lodash";
import { RouteIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import { Route } from "@/interfaces/Route";

type Props = {
  group_id: string;
};
export const AccessControlGroupCount = ({ group_id }: Props) => {
  const { data, isLoading } = useFetchApi<Route[]>("/routes");

  const routes = useMemo(() => {
    const routes = data?.filter((route) => {
      const groups = route?.access_control_groups;
      if (!groups) return false;
      return groups.includes(group_id);
    });
    return uniqBy(routes, "network_id");
  }, [data, group_id]);

  if (isLoading) return <Skeleton width={100} height={16} />;

  return routes && routes.length > 0 ? (
    <FullTooltip
      content={
        <div className={"text-xs max-w-lg w-full gap-2"}>
          {routes.map((route) => {
            const domains = route?.domains;

            return (
              <div
                key={route.id}
                className={
                  "w-full gap-10 flex text-gray-500/80 dark:text-nb-gray-300/80 justify-between"
                }
              >
                <span className={"flex items-center gap-2 text-gray-600 dark:text-nb-gray-200"}>
                  <RouteIcon size={12} /> {route.network_id}
                </span>
                {domains ? (
                  <span className={""}>{domains.join(", ")}</span>
                ) : (
                  <span className={"font-mono text-[10px]"}>
                    {route.network}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      }
    >
      <div
        className={
          "text-gray-500 dark:text-nb-gray-300 font-medium flex items-center gap-2 hover:text-gray-700 dark:hover:text-nb-gray-100 transition-all"
        }
      >
        <RouteIcon size={14} className={"shrink-0"} />
        {routes.length} Route(s)
      </div>
    </FullTooltip>
  ) : null;
};
