"use client";

import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import React, { Suspense } from "react";
import { CustomersProvider } from "@/cloud/distributor/contexts/CustomersProvider";
import DistributorCustomersTable from "@/cloud/distributor/table/DistributorCustomersTable";
import { DistributorDocsLink } from "@/cloud/distributor/DistributorDocsLink";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { DistributorCustomer } from "@/cloud/distributor/interfaces/Distributor";
import { useTranslations } from "@/i18n/LocaleProvider";
import PageContainer from "@/layouts/PageContainer";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePermissions } from "@/contexts/PermissionsProvider";

export default function CustomersPage() {
  const { isDistributorInfoLoading } = useDistributor();
  if (isDistributorInfoLoading) return <FullScreenLoading fullScreen={false} />;
  return <CustomersPageContent />;
}

const CustomersPageContent = () => {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { data: customers, isLoading } = useFetchApi<DistributorCustomer[]>(
    "/integrations/msp/reseller/msps",
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <h1 ref={headingRef}>{t("customers.customers")}</h1>
        <Paragraph>
          {t("customers.useThisViewToManageCustomerAccountsAndTheirPlans")}
        </Paragraph>
        <Paragraph>
          <DistributorDocsLink />
          {t("customers.inOurDocumentation")}
        </Paragraph>
      </div>
      <RestrictedAccess
        page={t("customers.customers")}
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
