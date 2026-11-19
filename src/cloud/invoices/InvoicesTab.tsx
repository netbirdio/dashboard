import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { VerticalTabs } from "@components/VerticalTabs";
import { usePortalElement } from "@hooks/usePortalElement";
import * as Tabs from "@radix-ui/react-tabs";
import useFetchApi from "@utils/api";
import { isNetBirdCloud } from "@utils/netbird";
import { ReceiptTextIcon } from "lucide-react";
import * as React from "react";
import { Suspense } from "react";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import InvoicesTable from "@/cloud/invoices/table/InvoicesTable";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { Invoice } from "@/cloud/msp/interfaces/Invoice";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";

export const InvoicesTab = () => {
  const { permission } = usePermissions();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  return permission?.billing?.update && <InvoicesTabContent />;
};

export const InvoicesTabTrigger = () => {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  return (
    permission?.billing?.update &&
    isNetBirdCloud() && (
      <VerticalTabs.Trigger
        value="invoices"
        data-testid="settings-tab-invoices"
      >
        <ReceiptTextIcon size={14} />
        {t("invoices.title")}
      </VerticalTabs.Trigger>
    )
  );
};

const InvoicesTabContent = () => {
  const t = useTranslations();
  const { isActive: isDistributor } = useDistributor();
  const apiPath = isDistributor
    ? "/integrations/msp/reseller/invoices"
    : "/integrations/billing/invoices";

  const { data: invoices, isLoading } = useFetchApi<Invoice[]>(
    apiPath,
    true,
    false,
    true,
    {
      shouldRetryOnError: false,
    },
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <Tabs.Content value={"invoices"} data-testid="settings-content-invoices">
      <div className={"p-default py-6"}>
        <div className={"max-w-3xl mb-4"}>
          <div className={"flex justify-between items-center mb-5"}>
            <div>
              <h1 ref={headingRef}>{t("invoices.title")}</h1>
              <Paragraph>{t("invoices.description")}</Paragraph>
            </div>
          </div>
          <Suspense
            fallback={
              <div>
                <SkeletonTableHeader className={"!p-0"} />
                <div className={"mt-8 w-full"}>
                  <SkeletonTable withHeader={false} />
                </div>
              </div>
            }
          >
            <InvoicesTable
              isLoading={isLoading}
              invoices={invoices}
              headingTarget={portalTarget}
            />
          </Suspense>
        </div>
      </div>
    </Tabs.Content>
  );
};
