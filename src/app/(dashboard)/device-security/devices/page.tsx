"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { ShieldCheckIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import PageContainer from "@/layouts/PageContainer";

const DevicesTable = lazy(
  () => import("@/modules/device-security/DevicesTable"),
);

export default function DevicesPage() {
  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/device-security/devices"}
            label={"Device Security"}
            icon={<ShieldCheckIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/device-security/devices"}
            label={"Devices"}
            active
          />
        </Breadcrumbs>
        <h1>Device Certificates</h1>
        <Paragraph>
          Certificates issued to devices in your network. Renew or revoke
          certificates to control device access.
        </Paragraph>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <DevicesTable />
      </Suspense>
    </PageContainer>
  );
}
