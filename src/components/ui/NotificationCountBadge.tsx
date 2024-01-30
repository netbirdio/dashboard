import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  count?: number;
};
export const NotificationCountBadge = ({ count = 0 }: Props) => {
  return count ? (
    <div
      className={cn(
        count <= 9 ? "w-5 h-5" : "py-2.5 px-2",
        "relative bg-netbird flex items-center justify-center rounded-full text-white  !leading-[0]  text-xs font-semibold",
      )}
    >
      <span className="animate-ping absolute left-0 inline-flex h-full w-full rounded-full bg-netbird opacity-20"></span>
      {count || 0}
    </div>
  ) : null;
};
