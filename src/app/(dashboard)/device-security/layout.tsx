import { globalMetaTitle } from "@utils/meta";
import type { Metadata } from "next";
import { DeviceSecurityProvider } from "@/contexts/DeviceSecurityProvider";
import React from "react";

export const metadata: Metadata = {
  title: `Device Security - ${globalMetaTitle}`,
};

export default function DeviceSecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DeviceSecurityProvider>{children}</DeviceSecurityProvider>;
}
