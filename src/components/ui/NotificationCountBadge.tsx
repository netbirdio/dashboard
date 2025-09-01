import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  count?: number;
};
export const NotificationCountBadge = ({ count = 22 }: Props) => {
  count = 1;
  return count ? (
    <div
      className={cn(
        count <= 9 ? "w-4 h-4" : "py-2 px-1.5",
        "relative bg-netbird flex items-center justify-center rounded-full text-white  !leading-[0]  text-[0.6rem] font-semibold",
      )}
    >
      <span className="animate-ping absolute left-0 inline-flex h-full w-full rounded-full bg-netbird opacity-20"></span>
      <span className={"relative -left-[0.5px]"}>{count || 0}</span>
    </div>
  ) : null;
};
