"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import dayjs from "dayjs";
import { ExternalLinkIcon } from "lucide-react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import React, { useMemo } from "react";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import ServerPaginationProvider from "@/contexts/ServerPaginationProvider";
import PageContainer from "@/layouts/PageContainer";
import ReverseProxyEventsTable from "@/modules/reverse-proxy/events/ReverseProxyEventsTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { REVERSE_PROXY_EVENTS_DOCS_LINK } from "@/interfaces/ReverseProxy";

export default function ProxyLogsPage() {
  const { permission } = usePermissions();
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  const defaultFilters = useMemo(
    () => ({
      start_date: dayjs().subtract(7, "day").startOf("day").toISOString(),
      end_date: dayjs().endOf("day").toISOString(),
      sort_by: "timestamp",
      sort_order: "desc",
    }),
    [],
  );

  return (
    <PageContainer>
      <div className="p-default py-6">
        <Breadcrumbs>
          <Breadcrumbs.Item
            label="Reverse Proxy"
            disabled
            icon={<ReverseProxyIcon size={15} />}
          />
          <Breadcrumbs.Item
            href="/reverse-proxy/logs"
            label="Access Logs"
            icon={<ReverseProxyIcon size={15} />}
          />
        </Breadcrumbs>

        <h1 ref={headingRef}>Access Logs</h1>

        <Paragraph>
          View access logs for your reverse proxy services, including allowed
          and denied requests.{" "}
          <InlineLink href={REVERSE_PROXY_EVENTS_DOCS_LINK} target="_blank">
            Learn more <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>

      <RestrictedAccess
        page="Access Logs"
        hasAccess={permission?.services?.read}
      >
        <ServerPaginationProvider
          url="/events/proxy"
          defaultPageSize={25}
          defaultFilters={defaultFilters}
        >
          <PeersProvider>
            <ReverseProxyEventsTable headingTarget={portalTarget} />
          </PeersProvider>
        </ServerPaginationProvider>
      </RestrictedAccess>
    </PageContainer>
  );
}
