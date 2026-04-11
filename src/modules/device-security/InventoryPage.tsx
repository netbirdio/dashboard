"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Eye, EyeOff, LayoutListIcon, ShieldCheckIcon } from "lucide-react";
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

// ---- PasswordField local component ----

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  hasExisting?: boolean;
  onChange: (value: string) => void;
}

function PasswordField({ id, label, value, hasExisting, onChange }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          placeholder={hasExisting && !value ? "••••••••" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

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

const INVENTORY_TYPE_OPTIONS: Array<{ value: InventoryType; label: string; description: string }> = [
  { value: "static", label: "Static List", description: "Manually maintained list of allowed peer IDs" },
  { value: "intune", label: "Microsoft Intune", description: "Sync managed devices from Microsoft Intune" },
  { value: "jamf", label: "Jamf Pro", description: "Sync managed devices from Jamf Pro MDM" },
];

// ---- Sub-forms ----

interface StaticFormProps {
  config: StaticInventoryConfig;
  onChange: (config: StaticInventoryConfig) => void;
}

function StaticForm({ config, onChange }: StaticFormProps) {
  const value = config.peers.join("\n");

  const handleChange = (raw: string) => {
    const peers = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...config, peers });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Static Device List</p>
      <div className="flex flex-col gap-1">
        <Label htmlFor="static-peers">Peer IDs</Label>
        <textarea
          id="static-peers"
          rows={6}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={"Enter one peer ID per line, or comma-separated"}
          className={
            "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm " +
            "font-mono text-gray-900 placeholder:text-gray-400 " +
            "focus:outline-none focus:ring-2 focus:ring-nb-gray-900 " +
            "dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 dark:placeholder:text-gray-600"
          }
        />
        <HelpText>
          {config.peers.length > 0
            ? `${config.peers.length} peer ID${config.peers.length !== 1 ? "s" : ""} in list`
            : "No peers configured"}
        </HelpText>
      </div>
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
  const { inventoryConfig, inventoryConfigLoading, updateInventoryConfig } =
    useDeviceSecurityContext();

  const [localConfig, setLocalConfig] = useState<InventoryConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (inventoryConfig) setLocalConfig(inventoryConfig);
  }, [inventoryConfig]);

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
    notify({
      title: "Device Inventory",
      description: "Inventory configuration saved successfully.",
      promise: updateInventoryConfig(localConfig),
      loadingMessage: "Saving inventory configuration...",
    });
  }, [localConfig, updateInventoryConfig]);

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
            data-cy="save-inventory"
          >
            Save Changes
          </Button>
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
              {INVENTORY_TYPE_OPTIONS.map(({ value, label, description }) => (
                <label
                  key={value}
                  className={
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors " +
                    (localConfig.inventory_type === value
                      ? "border-nb-gray-900 bg-gray-50 dark:border-zinc-500 dark:bg-zinc-800"
                      : "border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600")
                  }
                >
                  <input
                    type="radio"
                    name="inventory-type"
                    value={value}
                    checked={localConfig.inventory_type === value}
                    onChange={() => handleTypeChange(value)}
                    className="mt-0.5 h-4 w-4 text-nb-gray-900 border-gray-300 focus:ring-nb-gray-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
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
