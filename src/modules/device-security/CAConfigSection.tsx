"use client";

import React from "react";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import type {
  CAConfig,
  CAType,
  SCEPCAConfig,
  SmallstepCAConfig,
  VaultCAConfig,
} from "@/interfaces/DeviceSecurity";
import { PasswordField } from "./PasswordField";

const DEFAULT_VAULT: VaultCAConfig = {
  address: "",
  token: "",
  has_token: false,
  mount: "pki",
  role: "netbird",
  namespace: "",
  timeout_seconds: 30,
};

const DEFAULT_SMALLSTEP: SmallstepCAConfig = {
  url: "",
  provisioner_token: "",
  has_provisioner_token: false,
  fingerprint: "",
  timeout_seconds: 30,
};

const DEFAULT_SCEP: SCEPCAConfig = {
  url: "",
  challenge: "",
  has_challenge: false,
  timeout_seconds: 30,
};

interface CAConfigSectionProps {
  caType: CAType;
  config: CAConfig;
  onChange: (config: CAConfig) => void;
}

export function CAConfigSection({ caType, config, onChange }: CAConfigSectionProps) {
  const updateVault = (updates: Partial<VaultCAConfig>) =>
    onChange({ ...config, ca_type: caType, vault: { ...(config.vault ?? DEFAULT_VAULT), ...updates } });

  const updateSmallstep = (updates: Partial<SmallstepCAConfig>) =>
    onChange({ ...config, ca_type: caType, smallstep: { ...(config.smallstep ?? DEFAULT_SMALLSTEP), ...updates } });

  const updateSCEP = (updates: Partial<SCEPCAConfig>) =>
    onChange({ ...config, ca_type: caType, scep: { ...(config.scep ?? DEFAULT_SCEP), ...updates } });

  if (caType === "builtin") return null;

  const title =
    caType === "vault"
      ? "HashiCorp Vault Configuration"
      : caType === "smallstep"
        ? "Smallstep CA Configuration"
        : "SCEP Configuration";

  return (
    <div className="flex flex-col gap-4 rounded-md border border-nb-gray-900 bg-nb-gray-940 p-4">
      <p className="text-sm font-medium text-nb-gray-300">{title}</p>

      {caType === "vault" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="vault-address">Vault Address</Label>
            <Input
              id="vault-address"
              type="url"
              placeholder="https://vault.example.com:8200"
              value={config.vault?.address ?? ""}
              onChange={(e) => updateVault({ address: e.target.value })}
            />
          </div>
          <PasswordField
            id="vault-token"
            label="Token"
            value={config.vault?.token ?? ""}
            hasExisting={config.vault?.has_token}
            onChange={(v) => updateVault({ token: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="vault-mount">Mount</Label>
              <Input id="vault-mount" placeholder="pki" value={config.vault?.mount ?? ""} onChange={(e) => updateVault({ mount: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="vault-role">Role</Label>
              <Input id="vault-role" placeholder="netbird" value={config.vault?.role ?? ""} onChange={(e) => updateVault({ role: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="vault-namespace">Namespace (optional)</Label>
              <Input id="vault-namespace" value={config.vault?.namespace ?? ""} onChange={(e) => updateVault({ namespace: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="vault-timeout">Timeout (seconds)</Label>
              <Input id="vault-timeout" type="number" min={1} max={300} value={config.vault?.timeout_seconds ?? 30} onChange={(e) => updateVault({ timeout_seconds: parseInt(e.target.value, 10) || 30 })} />
            </div>
          </div>
        </div>
      )}

      {caType === "smallstep" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="step-url">Smallstep CA URL</Label>
            <Input id="step-url" type="url" placeholder="https://ca.example.com" value={config.smallstep?.url ?? ""} onChange={(e) => updateSmallstep({ url: e.target.value })} />
          </div>
          <PasswordField
            id="step-token"
            label="Provisioner Token"
            value={config.smallstep?.provisioner_token ?? ""}
            hasExisting={config.smallstep?.has_provisioner_token}
            onChange={(v) => updateSmallstep({ provisioner_token: v })}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="step-fingerprint">Root CA Fingerprint</Label>
            <Input id="step-fingerprint" placeholder="sha256:abc123..." value={config.smallstep?.fingerprint ?? ""} onChange={(e) => updateSmallstep({ fingerprint: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="step-timeout">Timeout (seconds)</Label>
            <Input id="step-timeout" type="number" min={1} max={300} value={config.smallstep?.timeout_seconds ?? 30} onChange={(e) => updateSmallstep({ timeout_seconds: parseInt(e.target.value, 10) || 30 })} />
          </div>
        </div>
      )}

      {caType === "scep" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="scep-url">SCEP URL</Label>
            <Input id="scep-url" type="url" placeholder="https://scep.example.com/scep" value={config.scep?.url ?? ""} onChange={(e) => updateSCEP({ url: e.target.value })} />
          </div>
          <PasswordField
            id="scep-challenge"
            label="Challenge (optional)"
            value={config.scep?.challenge ?? ""}
            hasExisting={config.scep?.has_challenge}
            onChange={(v) => updateSCEP({ challenge: v })}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="scep-timeout">Timeout (seconds)</Label>
            <Input id="scep-timeout" type="number" min={1} max={300} value={config.scep?.timeout_seconds ?? 30} onChange={(e) => updateSCEP({ timeout_seconds: parseInt(e.target.value, 10) || 30 })} />
          </div>
        </div>
      )}
    </div>
  );
}
