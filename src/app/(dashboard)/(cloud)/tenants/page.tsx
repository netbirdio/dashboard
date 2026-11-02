"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useRedirect from "@hooks/useRedirect";
import useFetchApi from "@utils/api";
import React, { Suspense, useMemo } from "react";
import MSPIcon from "@/assets/icons/MSPIcon";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { TenantsProvider } from "@/cloud/msp/contexts/TenantsProvider";
import { Tenant } from "@/cloud/msp/interfaces/Tenant";
import { MSPTenantDocsLink } from "@/cloud/msp/MSPTenantDocsLink";
import MSPTenantsTable from "@/cloud/msp/MSPTenantsTable";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";

export default function TenantsPage() {
  const { isActive, isMSPInMSPContext, isMspInfoLoading } = useMSP();
  const { isOwnerOrAdmin } = useLoggedInUser();

  const show = useMemo(() => {
    if (!isActive) return false;
    return isMSPInMSPContext && isOwnerOrAdmin;
  }, [isActive, isMSPInMSPContext, isOwnerOrAdmin]);

  if (isMspInfoLoading) return <FullScreenLoading fullScreen={false} />;
  if (!show) return <Redirect />;
  return <TenantsPageContent />;
}

const Redirect = () => {
  useRedirect("/peers");
  return <FullScreenLoading fullScreen={false} />;
};

const TenantsPageContent = () => {
  const { permission } = usePermissions();
  const { data: tenants, isLoading } = useFetchApi<Tenant[]>(
    "/integrations/msp/tenants",
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  useFetchApi<User[]>("/users", true);

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/tenants"}
            label={"Tenants"}
            icon={<MSPIcon size={15} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Tenants</h1>
        <Paragraph>
          A list of all tenants and their subscription details. Use this view to
          manage accounts, plans and permissions.
        </Paragraph>
        <Paragraph>
          <MSPTenantDocsLink />
          in our documentation.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Tenants"} hasAccess={permission.tenants.read}>
        <Suspense fallback={<SkeletonTable />}>
          <TenantsProvider>
            <MSPTenantsTable
              isLoading={isLoading}
              headingTarget={portalTarget}
              tenants={tenants}
            />
          </TenantsProvider>
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
};
