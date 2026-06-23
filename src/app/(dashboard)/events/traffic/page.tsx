"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { ArrowLeftRightIcon, ExternalLinkIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { useIsFeatureLocked } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { TrafficEvent } from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TRAFFIC_EVENTS_DOC_LINK } from "@/cloud/traffic-events/TrafficEventSetting";
import TrafficEventsTable from "@/cloud/traffic-events/TrafficEventsTable";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { Pagination } from "@/interfaces/Pagination";
import PageContainer from "@/layouts/PageContainer";
import { useAccount } from "@/modules/account/useAccount";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import { EventStreamingCard } from "@/modules/integrations/event-streaming/EventStreamingCard";

const DEFAULT_PAGE = "1";
const DEFAULT_PAGE_SIZE = "10";

export default function NetworkTrafficPage() {
  const account = useAccount();
  const { permission } = usePermissions();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { users } = useUsers();

  const currentPage = searchParams.get("page") || DEFAULT_PAGE;
  const currentPageSize = searchParams.get("page_size") || DEFAULT_PAGE_SIZE;
  const searchTerm = searchParams.get("search") || "";
  const dateFrom = searchParams.get("start_date");
  const dateTo = searchParams.get("end_date");
  const userId = searchParams.get("user_id") || "";

  const typeFilter = searchParams.getAll("type") || [];
  const connectionTypeFilter = searchParams.get("connection_type") || "";
  const directionFilter = searchParams.getAll("direction") || [];
  const protocolFilter = searchParams.getAll("protocol") || [];

  const formattedDateFrom = dateFrom ? encodeURIComponent(dateFrom) : "";
  const formattedDateTo = dateTo ? encodeURIComponent(dateTo) : "";
  const formattedUserId = userId ? encodeURIComponent(userId) : "";

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (dateFrom || dateTo) {
      return {
        from: dateFrom ? dayjs(dateFrom).toDate() : undefined,
        to: dateTo ? dayjs(dateTo).toDate() : undefined,
      };
    }
    return undefined;
  });

  useEffect(() => {
    localStorage.removeItem(`netbird-table-pagination${pathname}`);
    localStorage.removeItem(`netbird-table-range${pathname}`);
    localStorage.removeItem(`netbird-table-search${pathname}`);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(pathname)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  }, [pathname]);

  const baseUrl = `/events/network-traffic`;
  const [apiUrl, setApiUrl] = useState(() => {
    let url = `${baseUrl}?page=${currentPage}&page_size=${currentPageSize}`;
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }
    if (formattedDateFrom) {
      url += `&start_date=${formattedDateFrom}`;
    }
    if (formattedDateTo) {
      url += `&end_date=${formattedDateTo}`;
    }
    if (typeFilter) {
      typeFilter.forEach((t) => {
        url += `&type=${encodeURIComponent(t)}`;
      });
    }
    if (connectionTypeFilter) {
      url += `&connection_type=${encodeURIComponent(connectionTypeFilter)}`;
    }
    if (directionFilter) {
      protocolFilter.forEach((d) => {
        url += `&direction=${encodeURIComponent(d)}`;
      });
    }
    if (formattedUserId) {
      url += `&user_id=${formattedUserId}`;
    }
    if (protocolFilter) {
      protocolFilter.forEach((protocol) => {
        url += `&protocol=${encodeURIComponent(protocol)}`;
      });
    }
    return url;
  });

  const isTrafficEventsLocked = useIsFeatureLocked("TRAFFIC_EVENTS");

  const {
    data: events,
    isLoading,
    mutate,
  } = useFetchApi<Pagination<TrafficEvent[]>>(
    apiUrl,
    false,
    true,
    !isTrafficEventsLocked,
  );

  // Fetch is suppressed while the feature lock resolves, refetch once unlocked.
  useEffect(() => {
    if (!isTrafficEventsLocked) {
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrafficEventsLocked]);

  const updateURL = useCallback(
    (newParams: Record<string, string | string[]>) => {
      const params = new URLSearchParams(searchParams.toString());

      const isFilterReset = Object.values(newParams).every(
        (value) => value === "",
      );

      params.set("page", currentPage);
      params.set("page_size", currentPageSize);

      if (isFilterReset) {
        params.delete("search");
        params.delete("start_date");
        params.delete("end_date");
        params.delete("type");
        params.delete("connection_type");
        params.delete("direction");
        params.delete("protocol");
        params.delete("user_id");
        params.set("page", "1");
        params.set("page_size", "10");
      } else {
        Object.entries(newParams).forEach(([key, value]) => {
          if (value === "") {
            if (key === "page_size" || key === "page") return;
            params.delete(key);
          } else if (Array.isArray(value)) {
            value.forEach((v, i) => {
              if (i === 0) {
                params.set(key, v);
                return;
              }
              params.append(key, v);
            });
          } else {
            params.set(key, value);
          }
        });
      }

      setApiUrl(`${baseUrl}?${params.toString()}`);

      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `${pathname}?${params.toString()}`,
        );
      }
    },
    [baseUrl, pathname, searchParams],
  );

  const handlePaginationChange = useCallback(
    ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
      updateURL({
        page: String(pageIndex + 1),
        page_size: String(pageSize),
      });
    },
    [updateURL],
  );

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      if (value === "" && currentPage !== "1") return;
      updateURL({
        search: value,
        page: "1",
      });
    },
    [updateURL],
  );

  const handleDateFilterChange = useCallback(
    (from?: Date, to?: Date) => {
      const params: Record<string, string> = {};

      if (from) {
        params.start_date = dayjs(from).toISOString();
      } else {
        params.start_date = "";
      }

      if (to) {
        params.end_date = dayjs(to).toISOString();
      } else {
        params.end_date = "";
      }

      params.page = "1";
      updateURL(params);
    },
    [updateURL],
  );

  const handleFilterChange = useCallback(
    (filters: {
      type?: string[];
      direction?: string[];
      protocol?: string[];
    }) => {
      const params: Record<string, string | string[]> = {};

      if (filters.type && filters.type.length > 0) {
        params.type = filters.type;
      } else {
        params.type = "";
      }

      if (filters.direction && filters.direction.length > 0) {
        params.direction = filters.direction;
      } else {
        params.direction = "";
      }

      if (filters.protocol && filters.protocol.length > 0) {
        params.protocol = filters.protocol;
      } else {
        params.protocol = "";
      }

      params.page = "1";
      updateURL(params);
    },
    [updateURL],
  );

  const handleConnectionTypeFilterChange = useCallback(
    (value: string) => {
      updateURL({
        connection_type: value,
        page: "1",
      });
    },
    [updateURL],
  );

  const handleUserFilterChange = useCallback(
    (selectedUserId: string) => {
      updateURL({
        user_id: selectedUserId || "",
        page: "1",
      });
    },
    [updateURL],
  );

  const handleResetAllFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "10");

    const newUrl = `${baseUrl}?${params.toString()}`;
    setApiUrl(newUrl);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
  }, [currentPageSize, baseUrl, pathname]);

  useEffect(() => {
    if (dateFrom || dateTo) {
      try {
        const fromDate = dateFrom ? dayjs(dateFrom).toDate() : undefined;
        const toDate = dateTo ? dayjs(dateTo).toDate() : undefined;

        const newDateRange = {
          from: fromDate,
          to: toDate,
        };
        setDateRange(newDateRange);
      } catch (error) {}
    } else if (dateRange) {
      setDateRange(undefined);
    }
  }, [dateFrom, dateTo]);

  const pagination = {
    pageIndex: parseInt(currentPage, 10) - 1,
    pageSize: parseInt(currentPageSize, 10),
  };

  const isEnabled = !!account?.settings?.extra?.network_traffic_logs_enabled;

  const tableFilters = {
    type: typeFilter,
    direction: directionFilter,
    protocol: protocolFilter,
  };

  const trafficEvents = useMemo(() => {
    // `data` may resolve to a non-array (e.g. an error body) on locked /
    // self-hosted deployments; guard so `.map` never throws.
    if (!Array.isArray(events?.data)) return undefined;
    return events.data.map((event) => ({
      ...event,
      id: event.flow_id,
    }));
  }, [events]);

  return (
    <PageContainer>
      <div className="p-default py-6">
        <Breadcrumbs>
          <Breadcrumbs.Item
            label="Activity"
            disabled
            icon={<ActivityIcon size={13} />}
          />
          <Breadcrumbs.Item
            href="/events/traffic"
            label="Traffic Events"
            icon={<ArrowLeftRightIcon size={15} />}
          />
        </Breadcrumbs>

        <h1>{`${events?.total_records ?? 0}`} Traffic Events</h1>

        <Paragraph>
          Traffic events is an experimental feature. Functionality and behavior
          may evolve, including changes to how data is collected or reported.
        </Paragraph>

        <Paragraph>
          Learn more about{" "}
          <InlineLink href={TRAFFIC_EVENTS_DOC_LINK} target="_blank">
            Traffic Events <ExternalLinkIcon size={12} />
          </InlineLink>{" "}
          in our documentation.
        </Paragraph>
      </div>

      <RestrictedAccess
        page="Traffic Events"
        hasAccess={permission.events.read}
      >
        <div className={"p-default"}>
          <LockedFeatureInfoCard
            className={"mb-6"}
            feature={"TRAFFIC_EVENTS"}
            featureText={"Traffic Events"}
          />
        </div>
        <LockedFeatureOverlay feature={"TRAFFIC_EVENTS"}>
          <EventStreamingCard />
          <PeersProvider>
            <TrafficEventsTable
              events={trafficEvents}
              isLoading={isLoading}
              isSettingEnabled={isEnabled}
              totalRecords={events?.total_records}
              totalPages={events?.total_pages}
              onPaginationChange={handlePaginationChange}
              pagination={pagination}
              onGlobalFilterChange={handleGlobalFilterChange}
              globalFilter={searchTerm}
              onDateFilterChange={handleDateFilterChange}
              dateFrom={dateFrom || ""}
              dateTo={dateTo || ""}
              apiUrl={apiUrl}
              filters={tableFilters}
              onFilterChange={handleFilterChange}
              users={users}
              userId={userId}
              onUserFilterChange={handleUserFilterChange}
              onResetAllFilters={handleResetAllFilters}
              connectionTypeFilter={connectionTypeFilter}
              onConnectionTypeFilterChange={handleConnectionTypeFilterChange}
            />
          </PeersProvider>
        </LockedFeatureOverlay>
      </RestrictedAccess>
    </PageContainer>
  );
}
