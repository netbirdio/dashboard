"use client";

import MSPProvider from "@/cloud/msp/contexts/MSPProvider";
import UsersProvider from "@/contexts/UsersProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MSPProvider>
      <UsersProvider>{children}</UsersProvider>
    </MSPProvider>
  );
}
