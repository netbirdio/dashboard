"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { InfoIcon, ShieldCheckIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import PageContainer from "@/layouts/PageContainer";

const TrustedCAsTable = lazy(
  () => import("@/modules/device-security/TrustedCAsTable"),
);

export default function TrustedCAsPage() {
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/device-security/trusted-cas"}
            label={"Device Security"}
            icon={<ShieldCheckIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/device-security/trusted-cas"}
            label={"Trusted CAs"}
            active
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Trusted CAs</h1>
        <Paragraph>
          Certificate Authorities trusted for device authentication. Upload CA
          certificates when devices bring their own certificates signed by
          external authorities.
        </Paragraph>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Trusted CAs are used when devices present certificates signed by an
            external CA. This is different from the built-in CA used for
            certificate issuance.
          </p>
        </div>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <TrustedCAsTable headingTarget={portalTarget} />
      </Suspense>
    </PageContainer>
  );
}
