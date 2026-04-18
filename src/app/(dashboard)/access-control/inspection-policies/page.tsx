"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, ShieldCheck } from "lucide-react";
import React, { lazy, Suspense } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { InspectionPolicy } from "@/interfaces/Network";
import PageContainer from "@/layouts/PageContainer";

const InspectionPoliciesTable = lazy(
  () =>
    import(
      "@/modules/networks/inspection/InspectionPoliciesTable"
    ),
);

export default function InspectionPoliciesPage() {
  const { permission } = usePermissions();
  const { data: policies, isLoading } =
    useFetchApi<InspectionPolicy[]>("/inspection-policies");

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/access-control"}
            label={"Access Control"}
            icon={<AccessControlIcon size={14} />}
          />
          <Breadcrumbs.Item
            href={"/access-control/inspection-policies"}
            label={"Inspection Policies"}
            icon={<ShieldCheck size={15} />}
          />
        </Breadcrumbs>
        <h1>Inspection Policies</h1>
        <Paragraph>
          Create reusable inspection rule sets for transparent proxy traffic
          inspection. Attach them to access control policies to inspect traffic
          flowing through routing peers.
        </Paragraph>
      </div>
      <PoliciesProvider>
        <Suspense fallback={<SkeletonTable />}>
          <InspectionPoliciesTable
            policies={policies ?? []}
            isLoading={isLoading}
          />
        </Suspense>
      </PoliciesProvider>
    </PageContainer>
  );
}
