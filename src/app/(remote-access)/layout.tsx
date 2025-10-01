"use client";

import UsersProvider from "@/contexts/UsersProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
      <UsersProvider>{children}</UsersProvider>
  );
}
