"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { useHasChanges } from "@hooks/useHasChanges";
import { LayoutListIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useDeviceSecurityContext } from "@/contexts/DeviceSecurityProvider";
import type {
  InventoryConfig,
  InventoryType,
  IntuneInventoryConfig,
  JamfInventoryConfig,
  StaticInventoryConfig,
} from "@/interfaces/DeviceSecurity";
import PageContainer from "@/layouts/PageContainer";
import { PasswordField } from "./PasswordField";

// ---- Constants ----

const SERIAL_SEPARATOR_RE = /[\n,]+/;

// ---- Default configs ----

const DEFAULT_STATIC: StaticInventoryConfig = {
  peers: [],
  serial_count: 0,
};

const DEFAULT_INTUNE: IntuneInventoryConfig = {
  tenant_id: "",
  client_id: "",
  client_secret: "",
  has_client_secret: false,
  require_compliance: false,
};

const DEFAULT_JAMF: JamfInventoryConfig = {
  jamf_url: "",
  username: "",
  password: "",
  has_password: false,
  require_management: false,
};

// ---- Inventory type options ----

interface InventoryTypeOption {
  value: InventoryType;
  label: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const INVENTORY_TYPE_OPTIONS: InventoryTypeOption[] = [
  { value: "static", label: "Static List", description: "Manually maintained list of allowed peer IDs" },
  { value: "intune", label: "Microsoft Intune", description: "Sync managed devices from Microsoft Intune" },
  { value: "jamf", label: "Jamf Pro", description: "Sync managed devices from Jamf Pro MDM" },
  { value: "fleetdm", label: "Fleet", description: "Sync managed devices from FleetDM / osquery", disabled: true, comingSoon: true },
  { value: "webhook", label: "Webhook", description: "Approve devices via a custom webhook", disabled: true, comingSoon: true },
];

// ---- Static form with two-tab UI ----

type StaticTab = "peers" | "serials";

interface StaticFormProps {
  config: StaticInventoryConfig;
  onChange: (config: StaticInventoryConfig) => void;
}

function StaticForm({ config, onChange }: StaticFormProps) {
  const [activeTab, setActiveTab] = useState<StaticTab>("peers");

  const wgKeys = config.peers.filter((p) => !p.startsWith("serial:"));
  const peersValue = wgKeys.join("\n");

  const handlePeersChange = (raw: string) => {
    const newKeys = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const serials = config.peers.filter((p) => p.startsWith("serial:"));
    onChange({ ...config, peers: [...newKeys, ...serials] });
  };

  const serialsValue = config.peers
    .filter((p) => p.startsWith("serial:"))
    .map((p) => p.replace(/^serial:/, ""))
    .join("\n");

  const handleSerialsChange = (raw: string) => {
    const newSerials = raw
      .split(SERIAL_SEPARATOR_RE)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith("serial:") ? s : `serial:${s}`));
    onChange({ ...config, peers: [...wgKeys, ...newSerials] });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Tab buttons */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setActiveTab("peers")}
          className={
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
            (activeTab === "peers"
              ? "border-nb-gray-900 text-gray-900 dark:border-zinc-400 dark:text-gray-100"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200")
          }
        >
          NetBird Peers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("serials")}
          className={
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
            (activeTab === "serials"
              ? "border-nb-gray-900 text-gray-900 dark:border-zinc-400 dark:text-gray-100"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200")
          }
        >
          Serial Numbers
        </button>
      </div>

      {/* Tab: NetBird Peers */}
      {activeTab === "peers" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select NetBird peers that are allowed to enroll. The device&apos;s WireGuard public key is matched during attestation.
          </p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="static-wg-keys">WireGuard Public Keys</Label>
            <textarea
              id="static-wg-keys"
              rows={6}
              value={peersValue}
              onChange={(e) => handlePeersChange(e.target.value)}
              placeholder={"Enter one WireGuard public key per line"}
              aria-describedby="static-wg-keys-help"
              className={
                "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm " +
                "font-mono text-gray-900 placeholder:text-gray-400 " +
                "focus:outline-none focus:ring-2 focus:ring-nb-gray-900 " +
                "dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 dark:placeholder:text-gray-600"
              }
            />
            <HelpText id="static-wg-keys-help">
              {wgKeys.length > 0
                ? `${wgKeys.length} WireGuard key${wgKeys.length !== 1 ? "s" : ""} in list`
                : "No peers configured"}
            </HelpText>
          </div>
        </div>
      )}

      {/* Tab: Serial Numbers */}
      {activeTab === "serials" && (
        <div className="flex flex-col gap-3">
          <Callout variant="warning">
            Serial numbers are less secure than WireGuard keys. Use only if your MDM enforces serial uniqueness.
          </Callout>
          <div className="flex flex-col gap-1">
            <Label htmlFor="static-serials">Serial Numbers</Label>
            <textarea
              id="static-serials"
              rows={6}
              value={serialsValue}
              onChange={(e) => handleSerialsChange(e.target.value)}
              placeholder={"Enter one serial number per line"}
              aria-describedby="static-serials-help"
              className={
                "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm " +
                "font-mono text-gray-900 placeholder:text-gray-400 " +
                "focus:outline-none focus:ring-2 focus:ring-nb-gray-900 " +
                "dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 dark:placeholder:text-gray-600"
              }
            />
            <HelpText id="static-serials-help">
              {config.serial_count > 0
                ? `${config.serial_count} serial number${config.serial_count !== 1 ? "s" : ""} stored`
                : "No serial numbers configured"}
            </HelpText>
          </div>
        </div>
      )}
    </div>
  );
}

interface IntuneFormProps {
  config: IntuneInventoryConfig;
  onChange: (config: IntuneInventoryConfig) => void;
}

function IntuneForm({ config, onChange }: IntuneFormProps) {
  const update = (patch: Partial<IntuneInventoryConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Microsoft Intune Configuration</p>
      <div className="flex flex-col gap-3">
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
          <Label htmlFor="intune-client-id">Client ID</Label>
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
        <div className="flex items-center gap-2">
          <input
            id="intune-require-compliance"
            type="checkbox"
            checked={config.require_compliance}
            onChange={(e) => update({ require_compliance: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-nb-gray-900 focus:ring-nb-gray-900"
          />
          <Label htmlFor="intune-require-compliance" className="cursor-pointer">
            Require compliance
          </Label>
        </div>
      </div>
    </div>
  );
}

interface JamfFormProps {
  config: JamfInventoryConfig;
  onChange: (config: JamfInventoryConfig) => void;
}

function JamfForm({ config, onChange }: JamfFormProps) {
  const update = (patch: Partial<JamfInventoryConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Jamf Pro Configuration</p>
      <div className="flex flex-col gap-3">
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
          <Label htmlFor="jamf-username">Username</Label>
          <Input
            id="jamf-username"
            placeholder="api-user"
            value={config.username}
            onChange={(e) => update({ username: e.target.value })}
          />
        </div>
        <PasswordField
          id="jamf-password"
          label="Password"
          value={config.password}
          hasExisting={config.has_password}
          onChange={(v) => update({ password: v })}
        />
        <div className="flex items-center gap-2">
          <input
            id="jamf-require-management"
            type="checkbox"
            checked={config.require_management}
            onChange={(e) => update({ require_management: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-nb-gray-900 focus:ring-nb-gray-900"
          />
          <Label htmlFor="jamf-require-management" className="cursor-pointer">
            Require management
          </Label>
        </div>
      </div>
    </div>
  );
}

// ---- Main page ----

const DEFAULT_CONFIG: InventoryConfig = {
  inventory_type: "static",
  static: DEFAULT_STATIC,
};

export default function InventoryPage() {
  const { inventoryConfig, inventoryConfigLoading, updateInventoryConfig, settings } =
    useDeviceSecurityContext();

  const [localConfig, setLocalConfig] = useState<InventoryConfig>(DEFAULT_CONFIG);

  const { hasChanges, updateRef } = useHasChanges([localConfig]);

  useEffect(() => {
    if (!inventoryConfig) return;
    setLocalConfig(inventoryConfig);
    updateRef([inventoryConfig]);
  }, [inventoryConfig, updateRef]);

  const handleTypeChange = (type: InventoryType) => {
    setLocalConfig((prev) => ({
      ...prev,
      inventory_type: type,
      static: prev.static ?? DEFAULT_STATIC,
      intune: prev.intune ?? DEFAULT_INTUNE,
      jamf: prev.jamf ?? DEFAULT_JAMF,
    }));
  };

  const handleStaticChange = (config: StaticInventoryConfig) =>
    setLocalConfig((prev) => ({ ...prev, static: config }));

  const handleIntuneChange = (config: IntuneInventoryConfig) =>
    setLocalConfig((prev) => ({ ...prev, intune: config }));

  const handleJamfChange = (config: JamfInventoryConfig) =>
    setLocalConfig((prev) => ({ ...prev, jamf: config }));

  const handleSave = useCallback(() => {
    if (localConfig.inventory_type === "intune") {
      const intune = localConfig.intune ?? DEFAULT_INTUNE;
      if (!intune.tenant_id || !intune.client_id) {
        notify.error("Tenant ID and Client ID are required for Intune");
        return;
      }
    }
    if (localConfig.inventory_type === "jamf") {
      const jamf = localConfig.jamf ?? DEFAULT_JAMF;
      if (!jamf.jamf_url) {
        notify.error("Server URL is required for Jamf");
        return;
      }
    }
    notify({
      title: "Device Inventory",
      description: "Inventory configuration saved successfully.",
      promise: updateInventoryConfig(localConfig).then((saved) => {
        updateRef([saved]);
      }),
      loadingMessage: "Saving inventory configuration...",
    });
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
            <Skeleton height={17} width={200} className="mb-2" />
            <Skeleton height={80} width="100%" />
          </div>
          <Skeleton height={120} width="100%" />
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
              Configure the device allow-list or MDM integration used for attestation-mode enrollment.
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
        <div className="mt-6">
          {attestationActive ? (
            <Callout variant="success">
              Inventory is active. Managed devices are automatically approved during enrollment.{" "}
              <Link href="/device-security/settings" className="underline font-medium">
                View Settings →
              </Link>
            </Callout>
          ) : (
            <Callout variant="warning">
              Attestation is not enabled. To use inventory-based enrollment, enable Attestation mode in{" "}
              <Link href="/device-security/settings" className="underline font-medium">
                Settings →
              </Link>
            </Callout>
          )}
        </div>

        <div className="flex flex-col gap-6 w-full mt-8">
          {/* Inventory type selector */}
          <div className="flex flex-col gap-1 sm:flex-row w-full sm:gap-4 items-start">
            <div className="min-w-[330px]">
              <Label>Inventory Source</Label>
              <HelpText>
                Choose how NetBird determines which devices are allowed to enroll via attestation
              </HelpText>
            </div>
            <div className="w-full flex flex-col gap-2">
              {INVENTORY_TYPE_OPTIONS.map(({ value, label, description, disabled, comingSoon }) => (
                <label
                  key={value}
                  className={
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors " +
                    (disabled
                      ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-zinc-700"
                      : "cursor-pointer " +
                        (localConfig.inventory_type === value
                          ? "border-nb-gray-900 bg-gray-50 dark:border-zinc-500 dark:bg-zinc-800"
                          : "border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600"))
                  }
                >
                  <input
                    type="radio"
                    name="inventory-type"
                    value={value}
                    checked={localConfig.inventory_type === value}
                    onChange={() => !disabled && handleTypeChange(value)}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 text-nb-gray-900 border-gray-300 focus:ring-nb-gray-900"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                      {comingSoon && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-zinc-700 dark:text-gray-400">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Type-specific config form */}
          {localConfig.inventory_type === "static" && (
            <StaticForm
              config={localConfig.static ?? DEFAULT_STATIC}
              onChange={handleStaticChange}
            />
          )}
          {localConfig.inventory_type === "intune" && (
            <IntuneForm
              config={localConfig.intune ?? DEFAULT_INTUNE}
              onChange={handleIntuneChange}
            />
          )}
          {localConfig.inventory_type === "jamf" && (
            <JamfForm
              config={localConfig.jamf ?? DEFAULT_JAMF}
              onChange={handleJamfChange}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
