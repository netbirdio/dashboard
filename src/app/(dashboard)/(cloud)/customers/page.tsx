"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import React, { Suspense } from "react";
import MSPIcon from "@/assets/icons/MSPIcon";
import { CustomersProvider } from "@/cloud/distributor/contexts/CustomersProvider";
import DistributorCustomersTable from "@/cloud/distributor/table/DistributorCustomersTable";
import { DistributorDocsLink } from "@/cloud/distributor/DistributorDocsLink";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { DistributorCustomer } from "@/cloud/distributor/interfaces/Distributor";
import PageContainer from "@/layouts/PageContainer";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePermissions } from "@/contexts/PermissionsProvider";

export default function CustomersPage() {
  const { isDistributorInfoLoading } = useDistributor();
  if (isDistributorInfoLoading) return <FullScreenLoading fullScreen={false} />;
  return <CustomersPageContent />;
}

const CustomersPageContent = () => {
  const { permission } = usePermissions();
  const { data: customers, isLoading } = useFetchApi<DistributorCustomer[]>(
    "/integrations/msp/reseller/msps",
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/customers"}
            label={"Customers"}
            icon={<MSPIcon size={15} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Customers</h1>
        <Paragraph>
          Use this view to manage customer accounts and their plans.
        </Paragraph>
        <Paragraph>
          <DistributorDocsLink />
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess
        page={"Customers"}
        hasAccess={permission.tenants.create}
      >
        <Suspense fallback={<SkeletonTable />}>
          <CustomersProvider>
            <DistributorCustomersTable
              isLoading={isLoading}
              headingTarget={portalTarget}
              customers={customers}
            />
          </CustomersProvider>
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
};
