"use client";

import { Tabs, TabsList, TabsTrigger } from "@components/Tabs";
import { IconSettings2 } from "@tabler/icons-react";
import { useGuardedRouter } from "@utils/navigation-guard";
import { User2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";

export const USERS_TABS = [
  { value: "users", href: "/team/users", label: "Users" },
  {
    value: "service-users",
    href: "/team/service-users",
    label: "Service Users",
  },
] as const;

export type UsersTab = (typeof USERS_TABS)[number]["value"];

/**
 * Users and Service Users are two pages behind one sidebar entry, Users;
 * these tabs switch between them. Service users are the API and automation
 * identities, so they sit next to the people rather than in the sidebar.
 */
export default function UsersTabs({
  current,
}: Readonly<{ current: UsersTab }>) {
  const router = useGuardedRouter();
  const { permission } = usePermissions();
  if (!permission.users.read) return null;

  return (
    <Tabs
      value={current}
      // Manual activation: arrow keys move focus, Enter or a click navigates.
      activationMode={"manual"}
      onValueChange={(value) => {
        const tab = USERS_TABS.find((t) => t.value === value);
        if (tab && tab.value !== current) router.push(tab.href);
      }}
      className={"pb-6"}
    >
      <TabsList justify={"start"} className={"px-8"}>
        <TabsTrigger value={"users"} data-testid={"users-tab-users"}>
          <User2 size={16} />
          Users
        </TabsTrigger>
        <TabsTrigger
          value={"service-users"}
          data-testid={"users-tab-service-users"}
        >
          <IconSettings2 size={16} />
          Service Users
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
