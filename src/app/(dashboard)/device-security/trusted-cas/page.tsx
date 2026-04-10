"use client";

import { DeviceSecurityProvider } from "@/contexts/DeviceSecurityProvider";
import TrustedCAsTable from "@/modules/device-security/TrustedCAsTable";

export default function TrustedCAsPage() {
  return (
    <DeviceSecurityProvider>
      <TrustedCAsTable />
    </DeviceSecurityProvider>
  );
}
