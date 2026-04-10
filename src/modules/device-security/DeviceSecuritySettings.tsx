"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
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
import React, { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";
import type {
  CAType,
  DeviceAuthMode,
  EnrollmentMode,
} from "@/interfaces/DeviceSecurity";
import PageContainer from "@/layouts/PageContainer";

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

const CA_TYPE_LABELS: Record<CAType, string> = {
  builtin: "Built-in CA",
  external: "External CA",
};

export default function DeviceSecuritySettings() {
  const { settings, settingsLoading, updateSettings, devices } =
    useDeviceSecurity();

  const [mode, setMode] = useState<DeviceAuthMode>("disabled");
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>("manual");
  const [caType, setCaType] = useState<CAType>("builtin");
  const [certValidityDays, setCertValidityDays] = useState(365);
  const [ocspEnabled, setOcspEnabled] = useState(false);
  const [failOpenOnOcsp, setFailOpenOnOcsp] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setMode(settings.mode);
    setEnrollmentMode(settings.enrollment_mode);
    setCaType(settings.ca_type);
    setCertValidityDays(settings.cert_validity_days);
    setOcspEnabled(settings.ocsp_enabled);
    setFailOpenOnOcsp(settings.fail_open_on_ocsp_unavailable);
  }, [settings]);

  const { hasChanges, updateRef } = useHasChanges([
    mode,
    enrollmentMode,
    caType,
    certValidityDays,
    ocspEnabled,
    failOpenOnOcsp,
  ]);

  const activeCertCount =
    devices?.filter((d) => !d.revoked).length ?? 0;

  const showCertOnlyWarning =
    mode === "cert-only" && activeCertCount === 0;

  const handleSave = useCallback(async () => {
    notify({
      title: "Device Security Settings",
      description: "Settings saved successfully.",
      promise: updateSettings({
        mode,
        enrollment_mode: enrollmentMode,
        ca_type: caType,
        cert_validity_days: certValidityDays,
        ocsp_enabled: ocspEnabled,
        fail_open_on_ocsp_unavailable: failOpenOnOcsp,
      }).then(() => {
        updateRef([
          mode,
          enrollmentMode,
          caType,
          certValidityDays,
          ocspEnabled,
          failOpenOnOcsp,
        ]);
      }),
      loadingMessage: "Saving device security settings...",
    });
  }, [
    mode,
    enrollmentMode,
    caType,
    certValidityDays,
    ocspEnabled,
    failOpenOnOcsp,
    updateSettings,
    updateRef,
  ]);

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
            <Select value={mode} onValueChange={(v) => setMode(v as DeviceAuthMode)}>
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
              onValueChange={(v) => setEnrollmentMode(v as EnrollmentMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ENROLLMENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {/* CA Type */}
          <SettingRow
            label="Certificate Authority"
            help="Choose between the built-in CA or an external CA for signing device certificates"
          >
            <Select
              value={caType}
              onValueChange={(v) => setCaType(v as CAType)}
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

          {/* Certificate Validity */}
          <SettingRow
            label="Certificate Validity (days)"
            help="Number of days a device certificate remains valid after issuance"
          >
            <Input
              type={"number"}
              min={1}
              max={3650}
              value={certValidityDays}
              onChange={(e) =>
                setCertValidityDays(parseInt(e.target.value, 10) || 0)
              }
              data-cy={"cert-validity-days"}
            />
          </SettingRow>

          {/* OCSP Enabled */}
          <FancyToggleSwitch
            value={ocspEnabled}
            onChange={setOcspEnabled}
            label={
              <>
                <ShieldCheckIcon size={15} />
                Enable OCSP
              </>
            }
            helpText={
              "Enable Online Certificate Status Protocol for real-time certificate revocation checking"
            }
          />

          {/* Fail Open on OCSP Unavailable */}
          {ocspEnabled && (
            <FancyToggleSwitch
              value={failOpenOnOcsp}
              onChange={setFailOpenOnOcsp}
              label={"Fail open on OCSP unavailable"}
              helpText={
                "Allow connections when the OCSP responder is unreachable. Disabling this may cause connectivity issues if the OCSP service goes down."
              }
            />
          )}
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
        "flex flex-col gap-1 sm:flex-row w-full sm:gap-4 items-center"
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
