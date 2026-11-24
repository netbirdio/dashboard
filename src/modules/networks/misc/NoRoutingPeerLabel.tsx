import { cn } from "@utils/helpers";
import { AlertTriangleIcon } from "lucide-react";
import * as React from "react";

type Props = {
  className?: string;
};

/**
 * The warning Control Center shows on a network frame without routers:
 * such a network cannot route, so its resources are unreachable.
 */
export const NoRoutingPeerLabel = ({ className }: Props) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 text-xs whitespace-nowrap",
      className,
    )}
  >
    <AlertTriangleIcon size={12} className={"shrink-0 text-yellow-400"} />
    No Routing Peer
  </span>
);
