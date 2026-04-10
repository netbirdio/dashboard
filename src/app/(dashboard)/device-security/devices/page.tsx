"use client";

import { DeviceSecurityProvider } from "@/contexts/DeviceSecurityProvider";
import DevicesTable from "@/modules/device-security/DevicesTable";

export default function DevicesPage() {
  return (
    <DeviceSecurityProvider>
      <DevicesTable />
    </DeviceSecurityProvider>
  );
}
