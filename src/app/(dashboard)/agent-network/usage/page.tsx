"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { LayoutDashboard, ScrollText } from "lucide-react";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import GroupsProvider from "@/contexts/GroupsProvider";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ServerPaginationProvider from "@/contexts/ServerPaginationProvider";
import PageContainer from "@/layouts/PageContainer";
import AgentAccessLogTable from "@/modules/agent-network/AgentAccessLogTable";
import AgentOverviewPanel from "@/modules/agent-network/AgentOverviewPanel";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";

// Tab ids — kept stable so ?tab=<id> URL hand-off works (e.g.
// /agent-network/usage?tab=access-logs), the same way Settings deep-links tabs.
const TAB_USAGE = "usage";
const TAB_ACCESS_LOGS = "access-logs";

const VALID_TABS = new Set([TAB_USAGE, TAB_ACCESS_LOGS]);

// UsageAndLogsPage surfaces the live access log and the spend dashboard.
// Budget rules and log-collection controls live under the separate
// Configuration entry. Providers are mounted once at the top so switching
// tabs is instant — no re-fetch on tab change.
export default function UsageAndLogsPage() {
  const { permission } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const queryTab = searchParams.get("tab") ?? "";
  const initialTab = VALID_TABS.has(queryTab) ? queryTab : TAB_USAGE;
  const [tab, setTab] = useState(initialTab);

  // Default the access-log view to the last 14 days. Computed once on mount so
  // the window is stable across re-renders; resetting filters returns here.
  const defaultAccessLogFilters = useMemo(
    () => ({
      start_date: dayjs().subtract(14, "day").startOf("day").toISOString(),
      end_date: dayjs().endOf("day").toISOString(),
    }),
    [],
  );

  // Keep the tab in sync when the ?tab= query changes (deep links / back-forward).
  // Also reset to the default when ?tab= is removed or invalid, so navigating
  // back to the bare URL doesn't leave the previous tab selected.
  useEffect(() => {
    setTab(VALID_TABS.has(queryTab) ? queryTab : TAB_USAGE);
  }, [queryTab]);

  // Reflect the active tab in the URL so it's shareable, like Settings.
  const onTabChange = (value: string) => {
    setTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <PageContainer>
      <div className={"p-default py-6 pb-0"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/agent-network/providers"}
            label={"Agent Network"}
            icon={<AgentNetworkIcon size={16} />}
          />
          <Breadcrumbs.Item
            href={"/agent-network/usage"}
            label={"Usage & Logs"}
            active={true}
          />
        </Breadcrumbs>
        <h1>Usage & Logs</h1>
        <Paragraph>
          Per-request audit with real caller identity, cost attribution, and
          budget controls.
        </Paragraph>
      </div>

      <RestrictedAccess
        page={"Usage & Logs"}
        hasAccess={permission?.services?.read}
      >
        <GroupsProvider>
          <PeersProvider>
            <AIProvidersProvider>
              <Tabs
                value={tab}
                onValueChange={onTabChange}
                defaultValue={initialTab}
                className={"pt-4 pb-0 mb-0"}
              >
                <TabsList justify={"start"} className={"px-8"}>
                  <TabsTrigger value={TAB_USAGE}>
                    <LayoutDashboard size={16} />
                    Usage
                  </TabsTrigger>
                  <TabsTrigger value={TAB_ACCESS_LOGS}>
                    <ScrollText size={16} />
                    Access Logs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={TAB_USAGE} className={"pb-8"}>
                  <Suspense fallback={<SkeletonTable />}>
                    <AgentOverviewPanel />
                  </Suspense>
                </TabsContent>

                <TabsContent value={TAB_ACCESS_LOGS} className={"pb-8"}>
                  <Suspense fallback={<SkeletonTable />}>
                    <ServerPaginationProvider
                      url={"/agent-network/access-logs"}
                      defaultPageSize={25}
                      defaultFilters={defaultAccessLogFilters}
                    >
                      <AgentAccessLogTable />
                    </ServerPaginationProvider>
                  </Suspense>
                </TabsContent>
              </Tabs>
            </AIProvidersProvider>
          </PeersProvider>
        </GroupsProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
