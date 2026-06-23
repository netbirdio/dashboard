import * as React from "react";
import {
  PlansAndBillingTab,
  PlansAndBillingTabTrigger,
} from "@/modules/billing/PlansAndBillingTab";
import { InvoicesTab, InvoicesTabTrigger } from "@/cloud/invoices/InvoicesTab";
import {
  NotificationsTabTrigger,
  NotificationTab,
} from "@/cloud/notifications/NotificationTab";

export const CloudSettingsTabContent = () => {
  return (
    <>
      <NotificationTab />
      <PlansAndBillingTab />
      <InvoicesTab />
    </>
  );
};

export const CloudSettingsTabTrigger = () => {
  return (
    <>
      <NotificationsTabTrigger />
      <PlansAndBillingTabTrigger />
      <InvoicesTabTrigger />
    </>
  );
};
