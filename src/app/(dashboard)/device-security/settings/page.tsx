"use client";

import DeviceSecuritySettings from "@/modules/device-security/DeviceSecuritySettings";
import { DeviceSecurityProvider } from "@/contexts/DeviceSecurityProvider";

export default function SettingsPage() {
  return (
    <DeviceSecurityProvider>
      <DeviceSecuritySettings />
    </DeviceSecurityProvider>
  );
}
