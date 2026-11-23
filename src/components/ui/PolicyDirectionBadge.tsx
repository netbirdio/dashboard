import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import * as React from "react";
import LongArrowBidirectionalIcon from "@/assets/icons/LongArrowBidirectionalIcon";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";

type Props = {
  bidirectional: boolean;
  // A one-way arrow points left, from the second side to the first.
  reverse?: boolean;
  className?: string;
};

/** The green both-ways or blue one-way arrow the policy list shows. */
export const PolicyDirectionBadge = ({
  bidirectional,
  reverse = false,
  className,
}: Props) =>
  bidirectional ? (
    <Badge variant={"green"} className={cn("py-2 px-4", className)}>
      <LongArrowBidirectionalIcon
        size={60}
        autoHeight={true}
        className={"fill-green-500"}
      />
    </Badge>
  ) : (
    <Badge variant={"blueDark"} className={cn("py-2 px-4", className)}>
      <LongArrowLeftIcon
        size={60}
        autoHeight={true}
        className={cn("fill-sky-400", !reverse && "rotate-180")}
      />
    </Badge>
  );
