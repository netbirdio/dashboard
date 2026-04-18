import Button from "@components/Button";
import Card from "@components/Card";
import Badge from "@components/Badge";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { ArrowUpRightIcon, ExternalLinkIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Suspense, useMemo } from "react";
import { NetworkRouter, InspectionRule } from "@/interfaces/Network";
import { InspectionConfigPanel } from "@/modules/networks/inspection/InspectionConfigPanel";
import { InspectionRulesTable } from "@/modules/networks/inspection/InspectionRulesTable";

type Props = {
  routers?: NetworkRouter[];
  isLoading: boolean;
};

export const InspectionTabContent = ({ routers, isLoading }: Props) => {
  const inspectionRouter = useMemo(
    () => routers?.find((r) => r.inspection?.enabled),
    [routers],
  );

  const rules = useMemo(
    () => inspectionRouter?.inspection?.rules ?? [],
    [inspectionRouter],
  );

  return (
    <div className={"px-8"} id={"inspection"}>
      <div className={"flex justify-between items-center mb-5"}>
        <div>
          <Paragraph>
            Configure transparent traffic inspection on routing peers in this
            network.
          </Paragraph>
          <Paragraph>
            When enabled, traffic is transparently proxied and inspected based
            on rules managed in{" "}
            <InlineLink href={"/access-control/proxy-rules"}>
              Access Control
              <ArrowUpRightIcon size={12} />
            </InlineLink>
            .
          </Paragraph>
        </div>
      </div>

      <InspectionConfigPanel routers={routers} isLoading={isLoading} />

      {inspectionRouter && (
        <Suspense
          fallback={
            <div className={"mt-8"}>
              <SkeletonTableHeader className={"!p-0"} />
              <div className={"mt-8 w-full"}>
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          <InspectionRulesTable
            router={inspectionRouter}
            rules={rules}
            isLoading={isLoading}
          />
        </Suspense>
      )}

      {inspectionRouter && rules.length > 0 && (
        <div className={"mt-4 flex justify-end"}>
          <Link href={"/access-control/proxy-rules"}>
            <Button variant={"secondary"} size={"xs"}>
              <ShieldCheckIcon size={14} />
              View All Proxy Rules
              <ArrowUpRightIcon size={12} />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
