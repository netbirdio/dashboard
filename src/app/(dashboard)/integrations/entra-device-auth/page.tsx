"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { FingerprintIcon, FolderGit2Icon, SettingsIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useMemo } from "react";
import EntraDeviceIcon from "@/assets/icons/EntraDeviceIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PageContainer from "@/layouts/PageContainer";
import EntraDeviceAuthConfig from "@/modules/integrations/entra-device-auth/EntraDeviceAuthConfig";
import EntraDeviceMappingsTable from "@/modules/integrations/entra-device-auth/EntraDeviceMappingsTable";

/**
 * Admin UI for the Entra device authentication integration.
 *
 * This page is a thin shell that hosts two horizontally-tabbed panels:
 *  1. Configuration — singleton integration settings.
 *  2. Mappings — Entra security group → NetBird auto-groups CRUD.
 *
 * Permissions use optional chaining (`permission?.entra_device_auth?.read`)
 * so that the page stays usable against a management server that doesn't
 * publish the new permission module yet; admin writes will still be rejected
 * server-side in that case.
 */
export default function EntraDeviceAuthPage() {
  const { permission } = usePermissions();
  const queryParams = useSearchParams();
  const initialTab = useMemo(() => queryParams.get("tab") ?? "config", [
    queryParams,
  ]);

  const canRead = permission?.entra_device_auth?.read ?? true;

  return (
    <PageContainer>
      <div className="p-default py-6">
        <Breadcrumbs>
          <Breadcrumbs.Item
            href="/integrations/entra-device-auth"
            label="Integrations"
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href="/integrations/entra-device-auth"
            label="Entra Device Auth"
            icon={<EntraDeviceIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>Entra Device Auth</h1>
        <Paragraph>
          Zero-touch device enrollment for Microsoft Entra-joined machines.
          Devices hitting <code className="text-xs">/join/entra</code> on the
          management URL prove their identity with the Entra device
          certificate and are automatically placed into NetBird groups based
          on their Entra security-group membership.
        </Paragraph>
      </div>

      <RestrictedAccess page="Entra Device Auth" hasAccess={canRead}>
        <Tabs defaultValue={initialTab}>
          <TabsList justify="start" className="px-default">
            <TabsTrigger value="config">
              <FingerprintIcon size={14} />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="mappings">
              <FolderGit2Icon size={14} />
              Mappings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="config">
            <EntraDeviceAuthConfig />
          </TabsContent>
          <TabsContent value="mappings">
            <EntraDeviceMappingsTable />
          </TabsContent>
        </Tabs>
      </RestrictedAccess>
    </PageContainer>
  );
}
