import { PolicyDirectionBadge } from "@components/ui/PolicyDirectionBadge";
import React, { useMemo } from "react";
import { Policy } from "@/interfaces/Policy";
import { isResourceToResource } from "@/modules/access-control/useAccessControl";

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
  // A resource only receives traffic, unless the rule runs between two
  // network resources (site-to-site), where both sides have routing peers.
  const isSingleResource =
    !!firstRule?.destinationResource &&
    firstRule?.destinationResource?.type !== "peer" &&
    !isResourceToResource(
      firstRule?.sourceResource,
      firstRule?.destinationResource,
    );

  return (
    <div className={"flex h-full"}>
      <PolicyDirectionBadge bidirectional={bidirectional && !isSingleResource} />
    </div>
  );
}
