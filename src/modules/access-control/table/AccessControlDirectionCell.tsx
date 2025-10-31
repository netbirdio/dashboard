import Badge from "@components/Badge";
import React, { useMemo } from "react";
import LongArrowBidirectionalIcon from "@/assets/icons/LongArrowBidirectionalIcon";
import LongArrowLeftIcon from "@/assets/icons/LongArrowLeftIcon";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlDirectionCell({
  policy,
}: Readonly<Props>) {
  const firstRule = useMemo(() => {
    if (policy.rules.length > 0) return policy.rules[0];
    return undefined;
  }, [policy]);

  const bidirectional = firstRule ? firstRule.bidirectional : false;
  const isSingleResource =
    !!firstRule?.destinationResource &&
    firstRule?.destinationResource?.type !== "peer";

  return (
    <div className={"flex h-full"}>
      {bidirectional && !isSingleResource ? (
        <Badge variant={"green"} className={"py-2 px-4"}>
          <LongArrowBidirectionalIcon
            size={60}
            autoHeight={true}
            className={"fill-green-500"}
          />
        </Badge>
      ) : (
        <Badge variant={"blueDark"} className={"py-2 px-4"}>
          <LongArrowLeftIcon
            size={60}
            autoHeight={true}
            className={"fill-sky-400 rotate-180"}
          />
        </Badge>
      )}
    </div>
  );
}
