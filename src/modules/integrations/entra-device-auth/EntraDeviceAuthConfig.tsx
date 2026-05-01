import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import Separator from "@components/Separator";
import { useDialog } from "@/contexts/DialogProvider";
import useFetchApi, { useApiCall } from "@utils/api";
import { trim } from "lodash";
import {
  AlarmClock,
  GlobeIcon,
  IdCard,
  KeyIcon,
  SaveIcon,
  ShieldCheckIcon,
  TagIcon,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  EntraDeviceAuth,
  EntraDeviceAuthRequest,
  EntraDeviceMappingResolution,
  EntraDeviceMappingResolutionOptions,
} from "@/interfaces/EntraDeviceAuth";
import { Group } from "@/interfaces/Group";
import useGroupHelper from "@/modules/groups/useGroupHelper";

/**
 * Entra device auth integration configuration (singleton per account).
 *
 * Mirrors the backend admin endpoint `/api/integrations/entra-device-auth`.
 * Allows creating / updating the integration as well as wiping it.
 */
export default function EntraDeviceAuthConfig() {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  // Silently tolerate 404 (integration not yet configured) via ignoreError.
  const { data, isLoading } = useFetchApi<EntraDeviceAuth>(
    "/integrations/entra-device-auth",
    true,
  );

  const saveRequest = useApiCall<EntraDeviceAuth>(
    "/integrations/entra-device-auth",
  );
  const deleteRequest = useApiCall<EntraDeviceAuth>(
    "/integrations/entra-device-auth",
  );

  const canRead = permission?.entra_device_auth?.read ?? true;
  const canCreate = permission?.entra_device_auth?.create ?? true;
  const canUpdate = permission?.entra_device_auth?.update ?? true;
  const canDelete = permission?.entra_device_auth?.delete ?? true;

  // Form state
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [issuer, setIssuer] = useState("");
  const [audience, setAudience] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [requireIntune, setRequireIntune] = useState(false);
  const [allowTenantOnlyFallback, setAllowTenantOnlyFallback] = useState(false);
  const [mappingResolution, setMappingResolution] =
    useState<EntraDeviceMappingResolution>("strict_priority");
  const [revalidationInterval, setRevalidationInterval] = useState("");

  const [fallbackGroups, setFallbackGroups, { save: saveFallbackGroups }] =
    useGroupHelper({
      initial: [],
    });

  // Hydrate from server-side config once it arrives.
  useEffect(() => {
    if (!data) return;
    setTenantId(data.tenant_id ?? "");
    setClientId(data.client_id ?? "");
    // The server returns "********" when a secret is already stored; keep
    // the UI empty so we don't accidentally echo it back as plaintext.
    setClientSecret("");
    setIssuer(data.issuer ?? "");
    setAudience(data.audience ?? "");
    setEnabled(!!data.enabled);
    setRequireIntune(!!data.require_intune_compliant);
    setAllowTenantOnlyFallback(!!data.allow_tenant_only_fallback);
    setMappingResolution(data.mapping_resolution ?? "strict_priority");
    setRevalidationInterval(data.revalidation_interval ?? "");
  }, [data]);

  const isEditing = !!data?.id;
  const hasSecretStored = !!data && !!data.client_secret; // "********" when present
  const resolvedIssuer = useMemo(
    () =>
      issuer ||
      (tenantId
        ? `https://login.microsoftonline.com/${tenantId}/v2.0`
        : "https://login.microsoftonline.com/{tenant}/v2.0"),
    [issuer, tenantId],
  );

  const isDisabled = useMemo(() => {
    if (!trim(tenantId) || !trim(clientId)) return true;
    // Require a secret only when we don't already have one stored.
    if (!hasSecretStored && !trim(clientSecret)) return true;
    return false;
  }, [tenantId, clientId, clientSecret, hasSecretStored]);

  const buildRequest = async (): Promise<EntraDeviceAuthRequest> => {
    const groups = await saveFallbackGroups();
    return {
      tenant_id: trim(tenantId),
      client_id: trim(clientId),
      // Only send the secret when the operator has actually typed a new
      // one — the backend preserves the existing value otherwise.
      client_secret: trim(clientSecret) || undefined,
      issuer: trim(issuer) || undefined,
      audience: trim(audience) || undefined,
      enabled,
      require_intune_compliant: requireIntune,
      allow_tenant_only_fallback: allowTenantOnlyFallback,
      fallback_auto_groups: groups.map((g: Group) => g.id!).filter(Boolean),
      mapping_resolution: mappingResolution,
      revalidation_interval: trim(revalidationInterval) || undefined,
    };
  };

  const submit = async () => {
    const payload = await buildRequest();
    notify({
      title: "Entra Device Auth",
      description: isEditing
        ? "Integration updated successfully."
        : "Integration configured successfully.",
      promise: (isEditing ? saveRequest.put(payload) : saveRequest.post(payload)).then(
        () => {
          mutate("/integrations/entra-device-auth");
          mutate("/integrations/entra-device-auth/mappings");
          setClientSecret(""); // prevent the secret from lingering in state
        },
      ),
      loadingMessage: isEditing
        ? "Updating integration..."
        : "Configuring integration...",
    });
  };

  const handleDelete = async () => {
    const choice = await confirm({
      title: "Delete Entra Device Auth integration?",
      description:
        "This disables zero-touch Entra enrollment and removes all mappings. Peers already joined via Entra will stay registered but won't re-authenticate.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    notify({
      title: "Entra Device Auth",
      description: "Integration deleted.",
      promise: deleteRequest.del().then(() => {
        mutate("/integrations/entra-device-auth");
        mutate("/integrations/entra-device-auth/mappings");
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  if (!canRead) {
    return (
      <Paragraph className="px-6 py-8">
        You don&apos;t have permission to view the Entra device authentication
        integration.
      </Paragraph>
    );
  }

  return (
    <div className="w-full">
      <div className="px-default py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1>Configuration</h1>
            <Paragraph>
              Connect NetBird to your Microsoft Entra tenant so Entra-joined
              devices can enroll without user interaction. Dedicated endpoint:{" "}
              <code className="text-xs">/join/entra</code>
            </Paragraph>
          </div>
          {isEditing && (
            <Button
              variant="danger-outline"
              size="sm"
              onClick={handleDelete}
              disabled={!canDelete}
            >
              <Trash2 size={14} />
              Delete integration
            </Button>
          )}
        </div>
      </div>

      <div className="px-default flex flex-col gap-8 max-w-3xl">
        <div>
          <Label>Tenant ID</Label>
          <HelpText>
            Microsoft Entra tenant GUID (the directory NetBird will trust).
          </HelpText>
          <Input
            placeholder="00000000-0000-0000-0000-000000000000"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            customPrefix={<TagIcon size={16} className="text-nb-gray-300" />}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label>Application (client) ID</Label>
          <HelpText>
            Application registered in Entra used for Microsoft Graph lookups.
          </HelpText>
          <Input
            placeholder="00000000-0000-0000-0000-000000000000"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            customPrefix={<IdCard size={16} className="text-nb-gray-300" />}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label>Client secret</Label>
          <HelpText>
            {hasSecretStored
              ? "A secret is already stored. Leave empty to keep it, or enter a new value to rotate."
              : "Client secret for the app registration. Required on first setup."}
          </HelpText>
          <Input
            type="password"
            placeholder={hasSecretStored ? "••••••••" : "Enter client secret"}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            customPrefix={<KeyIcon size={16} className="text-nb-gray-300" />}
            disabled={isLoading || !(canCreate || canUpdate)}
          />
        </div>

        <div>
          <Label>Issuer (optional)</Label>
          <HelpText>
            OIDC issuer used when validating device tokens. Defaults to{" "}
            <code className="text-xs">{resolvedIssuer}</code> when empty.
          </HelpText>
          <Input
            placeholder={resolvedIssuer}
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            customPrefix={<GlobeIcon size={16} className="text-nb-gray-300" />}
            disabled={isLoading}
          />
        </div>

        <div>
          <Label>Audience (optional)</Label>
          <HelpText>
            Expected <code className="text-xs">aud</code> claim for Entra
            device tokens. Leave empty when using the default Entra app URI.
          </HelpText>
          <Input
            placeholder="api://netbird.example.com"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            customPrefix={<TagIcon size={16} className="text-nb-gray-300" />}
            disabled={isLoading}
          />
        </div>

        <Separator />

        <FancyToggleSwitch
          value={enabled}
          onChange={setEnabled}
          label={
            <>
              <ShieldCheckIcon size={15} />
              Enabled
            </>
          }
          helpText="When disabled, the /join/entra endpoint rejects all requests for this account."
          disabled={!canUpdate && isEditing}
        />

        <FancyToggleSwitch
          value={requireIntune}
          onChange={setRequireIntune}
          label={
            <>
              <ShieldCheckIcon size={15} />
              Require Intune compliance
            </>
          }
          helpText="Only allow devices marked as compliant by Microsoft Intune. Requires DeviceManagementManagedDevices.Read.All."
          disabled={!canUpdate && isEditing}
        />

        <FancyToggleSwitch
          value={allowTenantOnlyFallback}
          onChange={setAllowTenantOnlyFallback}
          label={
            <>
              <GlobeIcon size={15} />
              Allow tenant-only fallback
            </>
          }
          helpText="If no group-scoped mapping matches, apply the fallback auto-groups below for any valid device from this tenant."
          disabled={!canUpdate && isEditing}
        />

        {allowTenantOnlyFallback && (
          <div>
            <Label>Fallback auto-groups</Label>
            <HelpText>
              NetBird groups applied when the tenant-only fallback kicks in.
            </HelpText>
            <PeerGroupSelector
              onChange={setFallbackGroups}
              values={fallbackGroups}
              hideAllGroup
              disabled={!canUpdate && isEditing}
            />
          </div>
        )}

        <div>
          <Label>Mapping resolution</Label>
          <HelpText>
            How to combine results when a device matches multiple mappings.
          </HelpText>
          <Select
            value={mappingResolution}
            onValueChange={(v) =>
              setMappingResolution(v as EntraDeviceMappingResolution)
            }
            disabled={!canUpdate && isEditing}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select strategy..." />
            </SelectTrigger>
            <SelectContent>
              {EntraDeviceMappingResolutionOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  description={opt.description}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Revalidation interval (optional)</Label>
          <HelpText>
            Go-duration string (e.g. <code className="text-xs">24h</code>,{" "}
            <code className="text-xs">12h30m</code>). Leave empty to disable
            background revalidation.
          </HelpText>
          <Input
            placeholder="24h"
            value={revalidationInterval}
            onChange={(e) => setRevalidationInterval(e.target.value)}
            customPrefix={<AlarmClock size={16} className="text-nb-gray-300" />}
            disabled={!canUpdate && isEditing}
          />
        </div>

        <Separator />

        <div className="flex justify-end gap-3 pb-10">
          <Button
            variant="primary"
            onClick={submit}
            disabled={
              isDisabled ||
              isLoading ||
              (isEditing ? !canUpdate : !canCreate)
            }
          >
            <SaveIcon size={16} />
            {isEditing ? "Save changes" : "Create integration"}
          </Button>
        </div>
      </div>
    </div>
  );
}
