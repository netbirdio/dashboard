"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Checkbox } from "@components/Checkbox";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { cn } from "@utils/helpers";
import { useHasChanges } from "@hooks/useHasChanges";
import {
  DatabaseIcon,
  LayoutListIcon,
  MonitorSmartphoneIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useDeviceSecurityContext } from "@/contexts/DeviceSecurityProvider";
import type {
  InventoryConfig,
  IntuneInventoryConfig,
  JamfInventoryConfig,
  StaticInventoryConfig,
} from "@/interfaces/DeviceSecurity";
import PageContainer from "@/layouts/PageContainer";
import { PasswordField } from "./PasswordField";

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_STATIC: StaticInventoryConfig = {
  enabled: false,
  peers: [],
  serials: [],
};

const DEFAULT_INTUNE: IntuneInventoryConfig = {
  enabled: false,
  tenant_id: "",
  client_id: "",
  client_secret: "",
  has_client_secret: false,
  require_compliance: false,
};

const DEFAULT_JAMF: JamfInventoryConfig = {
  enabled: false,
  jamf_url: "",
  client_id: "",
  client_secret: "",
  has_client_secret: false,
  require_management: false,
};

const DEFAULT_CONFIG: InventoryConfig = {
  static: DEFAULT_STATIC,
  intune: DEFAULT_INTUNE,
  jamf: DEFAULT_JAMF,
};

// ── Static source form ────────────────────────────────────────────────────────

type StaticTab = "peers" | "serials";

interface StaticFormProps {
  config: StaticInventoryConfig;
  onChange: (config: StaticInventoryConfig) => void;
}

function StaticForm({ config, onChange }: StaticFormProps) {
  const [activeTab, setActiveTab] = useState<StaticTab>("peers");
  const peersValue = config.peers.join("\n");

  const handlePeersChange = (raw: string) => {
    const newPeers = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...config, peers: newPeers });
  };

  return (
    <div
      className={cn(
        "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940",
        "px-5 pt-3 pb-5 mx-[0.25rem]",
      )}
    >
      {/* Sub-tabs */}
      <div className="flex border-b border-nb-gray-900 mb-4">
        {(["peers", "serials"] as StaticTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-netbird text-netbird"
                : "border-transparent text-nb-gray-400 hover:text-nb-gray-200",
            )}
          >
            {tab === "peers" ? "WireGuard Keys" : "Serial Numbers"}
          </button>
        ))}
      </div>

      {activeTab === "peers" && (
        <div className="flex flex-col gap-2">
          <HelpText>
            WireGuard public keys of NetBird peers allowed to enroll automatically.
            The key is matched against the peer&apos;s WireGuard identity during attestation.
          </HelpText>
          <textarea
            rows={6}
            value={peersValue}
            onChange={(e) => handlePeersChange(e.target.value)}
            placeholder={"Paste one WireGuard public key per line"}
            spellCheck={false}
            className={cn(
              "w-full rounded-md border border-nb-gray-900 bg-nb-gray-950",
              "px-3 py-2 text-sm font-mono text-nb-gray-100",
              "placeholder:text-nb-gray-600",
              "focus:outline-none focus:ring-1 focus:ring-netbird focus:border-netbird",
              "resize-y min-h-[120px]",
            )}
          />
          <HelpText>
            {config.peers.length > 0
              ? `${config.peers.length} key${config.peers.length !== 1 ? "s" : ""} in list`
              : "No keys configured"}
          </HelpText>
        </div>
      )}

      {activeTab === "serials" && (
        <div className="flex flex-col gap-2">
          <HelpText>
            Hardware serial numbers of devices allowed to enroll automatically.
            Use the serial number reported by the OS — on macOS:{" "}
            <code className="bg-nb-gray-900 px-1 rounded text-xs">
              system_profiler SPHardwareDataType | grep Serial
            </code>
            , on Windows:{" "}
            <code className="bg-nb-gray-900 px-1 rounded text-xs">
              wmic bios get SerialNumber
            </code>
            . One serial per line.
          </HelpText>
          <textarea
            rows={8}
            value={config.serials.join("\n")}
            onChange={(e) => {
              const newSerials = e.target.value
                .split(/[\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              onChange({ ...config, serials: newSerials });
            }}
            placeholder={"Paste one serial number per line\nC02XL1YLJHD5\nPF2RJKAM\nR90VM1XXPK"}
            spellCheck={false}
            className={cn(
              "w-full rounded-md border border-nb-gray-900 bg-nb-gray-950",
              "px-3 py-2 text-sm font-mono text-nb-gray-100",
              "placeholder:text-nb-gray-600",
              "focus:outline-none focus:ring-1 focus:ring-netbird focus:border-netbird",
              "resize-y min-h-[150px]",
            )}
          />
          <HelpText>
            {config.serials.length > 0
              ? `${config.serials.length} serial${config.serials.length !== 1 ? "s" : ""} in list`
              : "No serials configured"}
          </HelpText>
        </div>
      )}
    </div>
  );
}

// ── Intune source form ─────────────────────────────────────────────────────────

interface IntuneFormProps {
  config: IntuneInventoryConfig;
  onChange: (config: IntuneInventoryConfig) => void;
}

function IntuneForm({ config, onChange }: IntuneFormProps) {
  const update = (patch: Partial<IntuneInventoryConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div
      className={cn(
        "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940",
        "px-5 pt-4 pb-5 flex flex-col gap-4 mx-[0.25rem]",
      )}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="intune-tenant-id">Tenant ID</Label>
        <Input
          id="intune-tenant-id"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={config.tenant_id}
          onChange={(e) => update({ tenant_id: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="intune-client-id">Client ID (Application ID)</Label>
        <Input
          id="intune-client-id"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={config.client_id}
          onChange={(e) => update({ client_id: e.target.value })}
        />
      </div>
      <PasswordField
        id="intune-client-secret"
        label="Client Secret"
        value={config.client_secret}
        hasExisting={config.has_client_secret}
        onChange={(v) => update({ client_secret: v })}
      />
      <div className="flex items-center gap-3">
        <Checkbox
          id="intune-require-compliance"
          checked={config.require_compliance}
          onCheckedChange={(checked) =>
            update({ require_compliance: checked === true })
          }
        />
        <div>
          <Label htmlFor="intune-require-compliance" className="cursor-pointer">
            Require device compliance
          </Label>
          <HelpText>
            Only enroll devices that are marked as compliant in Intune.
          </HelpText>
        </div>
      </div>
    </div>
  );
}

// ── Jamf source form ──────────────────────────────────────────────────────────

interface JamfFormProps {
  config: JamfInventoryConfig;
  onChange: (config: JamfInventoryConfig) => void;
}

function JamfForm({ config, onChange }: JamfFormProps) {
  const update = (patch: Partial<JamfInventoryConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div
      className={cn(
        "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940",
        "px-5 pt-4 pb-5 flex flex-col gap-4 mx-[0.25rem]",
      )}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="jamf-server-url">Server URL</Label>
        <Input
          id="jamf-server-url"
          type="url"
          placeholder="https://yourorg.jamfcloud.com"
          value={config.jamf_url}
          onChange={(e) => update({ jamf_url: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="jamf-client-id">Client ID (API Role)</Label>
        <Input
          id="jamf-client-id"
          placeholder="netbird-integration"
          value={config.client_id}
          onChange={(e) => update({ client_id: e.target.value })}
        />
      </div>
      <PasswordField
        id="jamf-client-secret"
        label="Client Secret"
        value={config.client_secret}
        hasExisting={config.has_client_secret}
        onChange={(v) => update({ client_secret: v })}
      />
      <div className="flex items-center gap-3">
        <Checkbox
          id="jamf-require-management"
          checked={config.require_management}
          onCheckedChange={(checked) =>
            update({ require_management: checked === true })
          }
        />
        <div>
          <Label htmlFor="jamf-require-management" className="cursor-pointer">
            Require device management
          </Label>
          <HelpText>
            Only enroll devices that are actively managed in Jamf Pro.
          </HelpText>
        </div>
      </div>
    </div>
  );
}

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoonSource({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-md border border-nb-gray-910 bg-nb-gray-900/30 opacity-60">
      <div className="text-nb-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-nb-gray-200">{label}</span>
          <span className="inline-flex items-center rounded-full bg-nb-gray-800 px-2 py-0.5 text-xs font-medium text-nb-gray-400">
            Coming soon
          </span>
        </div>
        <p className="text-xs text-nb-gray-500">{description}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { inventoryConfig, inventoryConfigLoading, updateInventoryConfig, settings } =
    useDeviceSecurityContext();

  const [localConfig, setLocalConfig] = useState<InventoryConfig>(DEFAULT_CONFIG);

  const { hasChanges, updateRef } = useHasChanges([localConfig]);

  useEffect(() => {
    if (!inventoryConfig) return;
    setLocalConfig({
      static: inventoryConfig.static ?? DEFAULT_STATIC,
      intune: inventoryConfig.intune ?? DEFAULT_INTUNE,
      jamf: inventoryConfig.jamf ?? DEFAULT_JAMF,
    });
    updateRef([inventoryConfig]);
  }, [inventoryConfig, updateRef]);

  const updateStatic = useCallback(
    (patch: Partial<StaticInventoryConfig>) =>
      setLocalConfig((prev) => ({ ...prev, static: { ...prev.static, ...patch } })),
    [],
  );

  const updateIntune = useCallback(
    (cfg: IntuneInventoryConfig) =>
      setLocalConfig((prev) => ({ ...prev, intune: cfg })),
    [],
  );

  const updateJamf = useCallback(
    (cfg: JamfInventoryConfig) =>
      setLocalConfig((prev) => ({ ...prev, jamf: cfg })),
    [],
  );

  const handleSave = useCallback(async () => {
    if (localConfig.intune.enabled) {
      if (!localConfig.intune.tenant_id || !localConfig.intune.client_id) {
        notify.error("Tenant ID and Client ID are required for Intune");
        return;
      }
    }
    if (localConfig.jamf.enabled) {
      if (!localConfig.jamf.jamf_url) {
        notify.error("Server URL is required for Jamf");
        return;
      }
    }
    const savePromise = updateInventoryConfig(localConfig);
    notify({
      title: "Device Inventory",
      description: "Inventory configuration saved successfully.",
      promise: savePromise,
      loadingMessage: "Saving inventory configuration...",
    });
    try {
      const saved = await savePromise;
      updateRef([saved ?? localConfig]);
    } catch {
      return;
    }
  }, [localConfig, updateInventoryConfig, updateRef]);

  const enrollmentMode = settings?.enrollment_mode;
  const attestationActive =
    enrollmentMode === "attestation" || enrollmentMode === "both";

  if (inventoryConfigLoading) {
    return (
      <PageContainer>
        <div className="p-default py-6 max-w-2xl">
          <Skeleton height={24} width={200} className="mb-6" />
          <Skeleton height={32} width={160} className="mb-10" />
          <div className="mb-8">
            <Skeleton height={60} width="100%" className="mb-3" />
            <Skeleton height={60} width="100%" className="mb-3" />
            <Skeleton height={60} width="100%" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!inventoryConfigLoading && !inventoryConfig) {
    return (
      <PageContainer>
        <div className="p-default py-6 max-w-2xl">
          <Callout variant="error">
            Failed to load inventory configuration. Please refresh the page and try again.
          </Callout>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="p-default py-6 max-w-2xl">
        <Breadcrumbs>
          <Breadcrumbs.Item
            href="/device-security"
            label="Device Security"
            icon={<ShieldCheckIcon size={13} />}
          />
          <Breadcrumbs.Item
            href="/device-security/inventory"
            label="Inventory"
            active
            icon={<LayoutListIcon size={14} />}
          />
        </Breadcrumbs>

        <div className="flex items-start justify-between">
          <div>
            <h1>Device Inventory</h1>
            <Paragraph>
              Configure device allow-lists or MDM integrations for attestation enrollment.
              Multiple sources can be active simultaneously.
            </Paragraph>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
            data-cy="save-inventory"
          >
            Save Changes
          </Button>
        </div>

        {/* Status callout */}
        <div className="mt-6 mb-8">
          {attestationActive ? (
            <Callout variant="success">
              Inventory is active. Managed devices are automatically approved during enrollment.{" "}
              <Link href="/device-security/settings" className="underline font-medium">
                View Settings →
              </Link>
            </Callout>
          ) : (
            <Callout variant="warning">
              Attestation is not enabled. To use inventory-based enrollment, enable Attestation
              mode in{" "}
              <Link href="/device-security/settings" className="underline font-medium">
                Settings →
              </Link>
            </Callout>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Static allow-list */}
          <div className="flex flex-col">
            <FancyToggleSwitch
              value={localConfig.static.enabled}
              onChange={(v) => updateStatic({ enabled: v })}
              label={
                <>
                  <DatabaseIcon size={15} />
                  Static Allow-List
                </>
              }
              helpText="Manually maintained list of WireGuard keys or serial numbers."
            />
            {localConfig.static.enabled && (
              <StaticForm
                config={localConfig.static}
                onChange={(cfg) =>
                  setLocalConfig((prev) => ({ ...prev, static: cfg }))
                }
              />
            )}
          </div>

          {/* Microsoft Intune */}
          <div className="flex flex-col">
            <FancyToggleSwitch
              value={localConfig.intune.enabled}
              onChange={(v) => updateIntune({ ...localConfig.intune, enabled: v })}
              label={
                <>
                  <MonitorSmartphoneIcon size={15} />
                  Microsoft Intune
                </>
              }
              helpText="Approve Windows and other managed devices from Microsoft Intune."
            />
            {localConfig.intune.enabled && (
              <IntuneForm config={localConfig.intune} onChange={updateIntune} />
            )}
          </div>

          {/* Jamf Pro */}
          <div className="flex flex-col">
            <FancyToggleSwitch
              value={localConfig.jamf.enabled}
              onChange={(v) => updateJamf({ ...localConfig.jamf, enabled: v })}
              label={
                <>
                  <SmartphoneIcon size={15} />
                  Jamf Pro
                </>
              }
              helpText="Approve macOS and iOS devices managed by Jamf Pro."
            />
            {localConfig.jamf.enabled && (
              <JamfForm config={localConfig.jamf} onChange={updateJamf} />
            )}
          </div>

          {/* Coming soon */}
          <ComingSoonSource
            icon={<MonitorSmartphoneIcon size={18} />}
            label="Fleet"
            description="Sync managed devices from FleetDM / osquery"
          />
          <ComingSoonSource
            icon={<ShieldCheckIcon size={18} />}
            label="Webhook"
            description="Approve devices via a custom webhook endpoint"
          />
        </div>
      </div>
    </PageContainer>
  );
}
