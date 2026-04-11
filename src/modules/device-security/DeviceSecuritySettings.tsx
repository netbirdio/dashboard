"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { useHasChanges } from "@hooks/useHasChanges";
import {
  AlertTriangleIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useDeviceSecurityContext } from "@/contexts/DeviceSecurityProvider";
import type {
  CAConfig,
  CATestResult,
  CAType,
  DeviceAuthMode,
  EnrollmentMode,
} from "@/interfaces/DeviceSecurity";
import PageContainer from "@/layouts/PageContainer";
import { CAConfigSection } from "./CAConfigSection";
import { CATestPanel } from "./CATestPanel";

const DEVICE_AUTH_MODES: DeviceAuthMode[] = ["disabled", "optional", "cert-only", "cert-and-sso"];
const ENROLLMENT_MODES: EnrollmentMode[] = ["manual", "attestation", "both"];
const CA_TYPES: CAType[] = ["builtin", "vault", "smallstep", "scep"];

function isDeviceAuthMode(v: string): v is DeviceAuthMode {
  return DEVICE_AUTH_MODES.includes(v as DeviceAuthMode);
}
function isEnrollmentMode(v: string): v is EnrollmentMode {
  return ENROLLMENT_MODES.includes(v as EnrollmentMode);
}
function isCAType(v: string): v is CAType {
  return CA_TYPES.includes(v as CAType);
}

const MODE_LABELS: Record<DeviceAuthMode, string> = {
  disabled: "Disabled",
  optional: "Optional",
  "cert-only": "Certificate Only",
  "cert-and-sso": "Certificate + SSO",
};

const MODE_DESCRIPTIONS: Record<DeviceAuthMode, string> = {
  disabled: "Device certificate authentication is not used",
  optional: "Devices may authenticate with certificates but it is not required",
  "cert-only": "Only devices with valid certificates can connect",
  "cert-and-sso": "Devices must have a valid certificate and SSO authentication",
};

const ENROLLMENT_LABELS: Record<EnrollmentMode, string> = {
  manual: "Manual",
  attestation: "Attestation",
  both: "Both",
};

const ENROLLMENT_DESCRIPTIONS: Record<EnrollmentMode, string> = {
  manual: "You approve each device. New devices wait in the Enrollments queue until an admin clicks Approve",
  attestation: "Managed devices are approved automatically. Requires your MDM (Intune or Jamf) or a static device allow-list to be configured.",
  both: "Managed devices get in automatically; unmanaged devices wait for manual approval",
};

const CA_TYPE_LABELS: Record<CAType, string> = {
  builtin: "Built-in CA",
  vault: "HashiCorp Vault",
  smallstep: "Smallstep CA",
  scep: "SCEP",
};

export default function DeviceSecuritySettings() {
  const {
    settings,
    settingsLoading,
    updateSettings,
    devices,
    caConfig,
    updateCAConfig,
    testCAConnection,
  } = useDeviceSecurityContext();

  const [mode, setMode] = useState<DeviceAuthMode>("disabled");
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("manual");
  const [caType, setCaType] = useState<CAType>("builtin");
  const [certValidityDays, setCertValidityDays] = useState(365);
  const [localCAConfig, setLocalCAConfig] = useState<CAConfig>({ ca_type: "builtin" });
  const [testResult, setTestResult] = useState<CATestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const { hasChanges, updateRef } = useHasChanges([
    mode,
    enrollmentMode,
    caType,
    certValidityDays,
    localCAConfig,
  ]);

  useEffect(() => {
    if (!settings) return;
    const newMode = isDeviceAuthMode(settings.mode) ? settings.mode : "disabled";
    const newEnrollment = isEnrollmentMode(settings.enrollment_mode) ? settings.enrollment_mode : "manual";
    const newCAType = isCAType(settings.ca_type) ? settings.ca_type : "builtin";
    const newCertValidity = settings.cert_validity_days > 0 ? settings.cert_validity_days : 365;
    setMode(newMode);
    setEnrollmentMode(newEnrollment);
    setCaType(newCAType);
    setCertValidityDays(newCertValidity);
    updateRef([newMode, newEnrollment, newCAType, newCertValidity, localCAConfig]);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!caConfig) return;
    setLocalCAConfig(caConfig);
    updateRef([mode, enrollmentMode, caType, certValidityDays, caConfig]);
  }, [caConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCertCount = devices?.filter((d) => !d.revoked).length ?? 0;
  const showCertOnlyWarning =
    (mode === "cert-only" || mode === "cert-and-sso") && activeCertCount === 0;

  const handleSave = useCallback(async () => {
    const settingsPromise = updateSettings({
      mode,
      enrollment_mode: enrollmentMode,
      ca_type: caType,
      cert_validity_days: certValidityDays,
    });
    notify({
      title: "Device Security Settings",
      description: "Settings saved successfully.",
      promise: settingsPromise,
      loadingMessage: "Saving settings...",
    });
    try {
      await settingsPromise;
    } catch {
      return;
    }

    if (caType !== "builtin") {
      const caPromise = updateCAConfig(localCAConfig);
      notify({
        title: "CA Configuration",
        description: "CA configuration saved successfully.",
        promise: caPromise,
        loadingMessage: "Saving CA configuration...",
      });
      try {
        await caPromise;
      } catch {
        return;
      }
    }

    updateRef([mode, enrollmentMode, caType, certValidityDays, localCAConfig]);
  }, [
    mode,
    enrollmentMode,
    caType,
    certValidityDays,
    localCAConfig,
    settings,
    updateSettings,
    updateCAConfig,
    updateRef,
  ]);

  const handleTestCA = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testCAConnection(localCAConfig);
      setTestResult(result ?? {
        success: false,
        steps: [{
          name: "generate_csr",
          status: "error" as const,
          detail: "Request failed. Check network connection and try again.",
          elapsed_ms: 0,
        }],
      });
    } catch (e) {
      setTestResult({
        success: false,
        steps: [{
          name: "generate_csr",
          status: "error" as const,
          detail: e instanceof Error ? e.message : "Unexpected error",
          elapsed_ms: 0,
        }],
      });
    } finally {
      setTesting(false);
    }
  }, [localCAConfig, testCAConnection]);

  if (settingsLoading) {
    return (
      <PageContainer>
        <div className={"p-default py-6 max-w-2xl"}>
          <Skeleton height={24} width={200} className={"mb-6"} />
          <Skeleton height={32} width={110} className={"mb-10"} />
          <div className={"mb-8"}>
            <Skeleton height={17} width={200} className={"mb-2"} />
            <Skeleton height={80} width={"100%"} />
          </div>
          <div className={"mb-8"}>
            <Skeleton height={17} width={200} className={"mb-2"} />
            <Skeleton height={80} width={"100%"} />
          </div>
          <Skeleton height={80} width={"100%"} />
        </div>
      </PageContainer>
    );
  }

  if (!settingsLoading && !settings) {
    return (
      <PageContainer>
        <div className={"p-default py-6 max-w-2xl"}>
          <Callout variant={"error"}>
            Failed to load device security settings. Please refresh the page and try again.
          </Callout>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/device-security"}
            label={"Device Security"}
            icon={<ShieldCheckIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/device-security/settings"}
            label={"Settings"}
            active
            icon={<KeyIcon size={14} />}
          />
        </Breadcrumbs>

        <div className={"flex items-start justify-between"}>
          <div>
            <h1>Device Security Settings</h1>
            <Paragraph>
              Configure device certificate authentication and enrollment.
            </Paragraph>
          </div>
          <Button
            variant={"primary"}
            disabled={!hasChanges}
            onClick={handleSave}
            data-cy={"save-settings"}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8"}>
          {/* Authentication Mode */}
          <SettingRow
            label="Authentication Mode"
            help="Controls how device certificates are used for authentication"
          >
            <Select
              value={mode}
              onValueChange={(v) => {
                if (isDeviceAuthMode(v)) setMode(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    description={MODE_DESCRIPTIONS[value as DeviceAuthMode]}
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {showCertOnlyWarning && (
            <Callout variant={"warning"} icon={<AlertTriangleIcon size={14} />}>
              No devices currently have active certificates. Switching to
              certificate-only mode may lock out all devices.
            </Callout>
          )}

          {/* Enrollment Mode */}
          <SettingRow
            label="Enrollment Mode"
            help="How new devices are enrolled and issued certificates"
          >
            <Select
              value={enrollmentMode}
              onValueChange={(v) => {
                if (isEnrollmentMode(v)) setEnrollmentMode(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ENROLLMENT_LABELS).map(([value, label]) => (
                  <SelectItem
                    key={value}
                    value={value}
                    description={ENROLLMENT_DESCRIPTIONS[value as EnrollmentMode]}
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {/* Attestation callout */}
          {(enrollmentMode === "attestation" || enrollmentMode === "both") && (
            <Callout variant="info">
              Attestation requires inventory configuration. Configure your MDM (Intune, Jamf) or a static device allow-list.{" "}
              <Link
                href="/device-security/inventory"
                className="font-medium underline"
              >
                Go to Inventory →
              </Link>
            </Callout>
          )}

          {/* Certificate Authority */}
          <SettingRow
            label="Certificate Authority"
            help="Choose between the built-in CA or an external CA for signing device certificates"
          >
            <Select
              value={caType}
              onValueChange={(v) => {
                if (isCAType(v)) setCaType(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CA_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {/* CA-specific config section */}
          {caType !== "builtin" && (
            <CAConfigSection
              caType={caType}
              config={localCAConfig}
              onChange={setLocalCAConfig}
            />
          )}

          {/* Test Connection */}
          {caType !== "builtin" && (
            <div className="flex items-center gap-3">
              <Button
                variant={"secondary"}
                disabled={testing}
                onClick={handleTestCA}
              >
                {testing ? "Testing..." : "Test Connection"}
              </Button>
              {testing && (
                <span className="text-sm text-nb-gray-400">Running CA test...</span>
              )}
            </div>
          )}

          {/* CA test results */}
          {testResult && <CATestPanel result={testResult} />}

          {/* Certificate Validity — only for built-in CA */}
          {caType === "builtin" && (
            <SettingRow
              label="Certificate Validity (days)"
              help="Number of days a device certificate remains valid after issuance"
            >
              <Input
                type={"number"}
                min={1}
                max={3650}
                value={certValidityDays}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (Number.isNaN(parsed)) return;
                  setCertValidityDays(Math.max(1, Math.min(3650, parsed)));
                }}
                data-cy={"cert-validity-days"}
              />
            </SettingRow>
          )}

          {/* Certificate Revocation */}
          <SettingRow
            label="Certificate Revocation"
            help="Revocation uses CRL (Certificate Revocation List), published every 12 hours."
          >
            <p className="font-mono text-sm text-nb-gray-400">
              {"GET /api/v1/device-auth/crl?account_id=<id>"}
            </p>
          </SettingRow>
        </div>
      </div>
    </PageContainer>
  );
}

function SettingRow({
  label,
  help,
  children,
}: Readonly<{
  label: string;
  help: string;
  children: React.ReactNode;
}>) {
  return (
    <div
      className={
        "flex flex-col gap-1 sm:flex-row w-full sm:gap-4 items-start"
      }
    >
      <div className={"min-w-[330px]"}>
        <Label>{label}</Label>
        <HelpText>{help}</HelpText>
      </div>
      <div className={"w-full"}>{children}</div>
    </div>
  );
}
