"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import { LayoutDashboardIcon, RefreshCwIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import PageContainer from "@/layouts/PageContainer";
import { DeviceDistributionMap } from "@/modules/overview/DeviceDistributionMap";
import { DeviceTypeDistribution } from "@/modules/overview/DeviceTypeDistribution";
import { RelayTrafficStats } from "@/modules/overview/RelayTrafficStats";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";

type RefreshContextType = {
  refreshTrigger: number;
  refreshInterval: number;
  triggerRefresh: () => void;
  setRefreshInterval: (interval: number) => void;
};

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function useOverviewRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error("useOverviewRefresh must be used within RefreshContext.Provider");
  }
  return context;
}

const refreshOptions = [
  { value: 0, labelKey: "overview.refreshInterval.off" },
  { value: 5000, labelKey: "overview.refreshInterval.5s" },
  { value: 10000, labelKey: "overview.refreshInterval.10s" },
  { value: 30000, labelKey: "overview.refreshInterval.30s" },
  { value: 60000, labelKey: "overview.refreshInterval.1m" },
  { value: 300000, labelKey: "overview.refreshInterval.5m" },
  { value: 900000, labelKey: "overview.refreshInterval.15m" },
];

export default function OverviewPage() {
  const { t } = useI18n();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <RefreshContext.Provider
      value={{
        refreshTrigger,
        refreshInterval,
        triggerRefresh,
        setRefreshInterval,
      }}
    >
      <PageContainer>
        <div className="p-default py-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <Breadcrumbs>
                <Breadcrumbs.Item
                  href="/overview"
                  label={t("overview.title")}
                  icon={<LayoutDashboardIcon size={13} />}
                />
              </Breadcrumbs>
              <h1>{t("overview.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerRefresh}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 dark:border-nb-gray-800 dark:bg-nb-gray-900 dark:text-neutral-100 dark:hover:bg-nb-gray-800"
                title={t("overview.refresh")}
              >
                <RefreshCwIcon size={14} />
                {t("overview.refresh")}
              </button>
              <Select
                value={refreshInterval.toString()}
                onValueChange={(value) => setRefreshInterval(Number.parseInt(value, 10))}
              >
                <SelectTrigger className="h-9 w-[120px] bg-neutral-50 dark:bg-nb-gray-900/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[120px]">
                  {refreshOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {t(option.labelKey as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-4 pb-6 lg:grid-cols-2">
          <DeviceDistributionMap />
          <DeviceTypeDistribution />
          <RelayTrafficStats />
        </div>
      </PageContainer>
    </RefreshContext.Provider>
  );
}
