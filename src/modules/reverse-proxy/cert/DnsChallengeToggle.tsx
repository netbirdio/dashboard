"use client";

// Phase 3 (p3-plan.md Wave 3) drives `enabled` ON when the parent's
// "Private service" flag is set. Keep this component controlled so the
// flag can flip the toggle without owning state here.

import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { SegmentedTabs } from "@components/SegmentedTabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { KeyRound } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

import { Credential, CredentialProviderType } from "@/interfaces/Credential";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ProviderFields } from "./ProviderFields";
import { dnsProviders, getProviderSchema } from "./providers";

export type DnsChallengeState = {
  dnsProvider: CredentialProviderType | "";
  // If set, the service should reference this saved credential. When
  // empty AND there is non-empty input in secretFields, the modal will
  // POST a fresh credential on save.
  credentialId: string;
  secretFields: Record<string, string>;
};

export const initialDnsChallengeState: DnsChallengeState = {
  dnsProvider: "",
  credentialId: "",
  secretFields: {},
};

type Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  state: DnsChallengeState;
  onStateChange: (s: DnsChallengeState) => void;
  // True when editing a service whose dns_credentials_ref is already
  // set. ProviderFields renders masked placeholders ("leave blank to
  // keep") in this mode.
  editingExisting: boolean;
};

export function DnsChallengeToggle({
  enabled,
  onEnabledChange,
  state,
  onStateChange,
  editingExisting,
}: Props) {
  const { credentials } = useReverseProxies();

  const setProvider = (value: string) => {
    const provider = value as CredentialProviderType;
    if (provider === state.dnsProvider) return;
    // Switching providers wipes both the saved-credential pick and the
    // inline field map (different schemas).
    onStateChange({
      dnsProvider: provider,
      credentialId: "",
      secretFields: {},
    });
  };

  const setCredentialId = (value: string) => {
    if (value === state.credentialId) return;
    onStateChange({ ...state, credentialId: value, secretFields: {} });
  };

  const setSecretField = (key: string, value: string) => {
    onStateChange({
      ...state,
      secretFields: { ...state.secretFields, [key]: value },
    });
  };

  const schema = getProviderSchema(
    state.dnsProvider === "" ? undefined : state.dnsProvider,
  );

  const matchingCredentials = useMemo<Credential[]>(() => {
    if (!credentials || state.dnsProvider === "") return [];
    return credentials.filter((c) => c.provider_type === state.dnsProvider);
  }, [credentials, state.dnsProvider]);

  const sourceMode: "saved" | "new" =
    state.credentialId !== ""
      ? "saved"
      : Object.values(state.secretFields).some((v) => v !== "")
      ? "new"
      : matchingCredentials.length > 0
      ? "saved"
      : "new";

  const setSourceMode = (mode: string) => {
    if (mode === "saved") {
      onStateChange({ ...state, secretFields: {} });
    } else {
      onStateChange({ ...state, credentialId: "" });
    }
  };

  return (
    <FancyToggleSwitch
      value={enabled}
      onChange={onEnabledChange}
      label={
        <>
          <KeyRound size={15} />
          Use DNS Challenge for Certificate Issuance
        </>
      }
      helpText="By default, services use the proxy's automatic TLS challenge (TLS-ALPN-01). Enable this to issue certs via DNS instead — required for private services and wildcard domains."
    >
      <div className={"flex-col flex gap-6"}>
        <div className={"flex flex-col gap-2"}>
          <Label>DNS Provider</Label>
          <Select value={state.dnsProvider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder={"Choose a provider…"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {dnsProviders.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    description={p.description}
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {schema && (
          <>
            <div className={"flex flex-col gap-2"}>
              <Label>Credential</Label>
              <SegmentedTabs value={sourceMode} onChange={setSourceMode}>
                <SegmentedTabs.List>
                  <SegmentedTabs.Trigger value={"saved"}>
                    Use saved credential
                  </SegmentedTabs.Trigger>
                  <SegmentedTabs.Trigger value={"new"}>
                    Create new credential
                  </SegmentedTabs.Trigger>
                </SegmentedTabs.List>
              </SegmentedTabs>
            </div>

            {sourceMode === "saved" && (
              <div className={"flex flex-col gap-2"}>
                <Label>Saved Credential</Label>
                {matchingCredentials.length === 0 ? (
                  <HelpText className={"!mt-0"}>
                    No saved credentials for this provider. Switch to
                    “Create new credential” or add one from the DNS
                    Credentials page.
                  </HelpText>
                ) : (
                  <Select
                    value={state.credentialId}
                    onValueChange={setCredentialId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={"Choose a saved credential…"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {matchingCredentials.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {sourceMode === "new" && (
              <div className={"flex flex-col gap-2"}>
                <Label>Provider Credentials</Label>
                <ProviderFields
                  schema={schema}
                  values={state.secretFields}
                  onChange={setSecretField}
                  editingExisting={editingExisting}
                />
              </div>
            )}
          </>
        )}
      </div>
    </FancyToggleSwitch>
  );
}
