"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { Callout } from "@components/Callout";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { ShieldCheckIcon } from "lucide-react";
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
        <div className="mt-3">
          <Callout variant="info">
            Trusted CAs are used when devices present certificates signed by an
            external CA. This is different from the built-in CA used for
            certificate issuance.
          </Callout>
        </div>
      </div>
      <Suspense fallback={<SkeletonTable />}>
        <TrustedCAsTable headingTarget={portalTarget} />
      </Suspense>
    </PageContainer>
  );
}
