"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { ShieldCheckIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import PageContainer from "@/layouts/PageContainer";

const EnrollmentsTable = lazy(
  () => import("@/modules/device-security/EnrollmentsTable"),
);

export default function EnrollmentsPage() {
  return (
    <PageContainer>
        <div className="p-default py-6">
          <Breadcrumbs>
            <Breadcrumbs.Item
              href="/device-security/enrollments"
              label="Device Security"
              icon={<ShieldCheckIcon size={13} />}
            />
            <Breadcrumbs.Item
              href="/device-security/enrollments"
              label="Enrollments"
              active
            />
          </Breadcrumbs>
          <h1>Device Enrollments</h1>
          <Paragraph>
            Review and manage device enrollment requests. Approve or reject
            pending requests to control which devices can connect to your
            network.
          </Paragraph>
        </div>
        <Suspense fallback={<SkeletonTable />}>
          <EnrollmentsTable />
        </Suspense>
    </PageContainer>
  );
}
