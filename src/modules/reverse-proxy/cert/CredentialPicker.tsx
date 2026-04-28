"use client";

// CredentialPicker is the shared provider+credential picker used by both
// the certificate tab (DnsChallengeToggle) and the custom-domain
// auto-configure flow (CustomDomainModal). The two surfaces consume the
// same `/credentials` SWR key, so a credential added in either place
// shows up in the other immediately.
//
// scopeContext drives a per-provider warning callout — the cert path
// needs only _acme-challenge-narrow scope, but the auto-configure path
// needs full zone-write access. Users coming from the cert flow are
// likely to bring an _acme-challenge-only token and hit a 403 at
// write time without a prominent up-front warning, so the warning
// lives here next to the credential picker rather than buried in
// error handling.

import { Callout } from "@components/Callout";
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
import { AlertTriangleIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";

import { Credential, CredentialProviderType } from "@/interfaces/Credential";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ProviderFields } from "./ProviderFields";
import { dnsProviders, getProviderSchema } from "./providers";

// CredentialPickerState is the picker's controlled value. dnsProvider
// is the chosen provider type; credentialId is non-empty when the user
// picked a saved credential; secretFields holds the inline form for the
// "Create new credential" path.
export type CredentialPickerState = {
  dnsProvider: CredentialProviderType | "";
  credentialId: string;
  secretFields: Record<string, string>;
};

export const initialCredentialPickerState: CredentialPickerState = {
  dnsProvider: "",
  credentialId: "",
  secretFields: {},
};

type Props = {
  state: CredentialPickerState;
  onStateChange: (s: CredentialPickerState) => void;
  // True when editing a service whose dns_credentials_ref is already
  // set. ProviderFields renders masked placeholders ("leave blank to
  // keep") in this mode.
  editingExisting: boolean;
  // "cert" — picking a credential for DNS-01 ACME challenge issuance.
  // "auto-configure" — picking a credential to write the wildcard CNAME
  // for a custom domain on the user's behalf. Drives the broader-scope
  // warning callout.
  scopeContext: "cert" | "auto-configure";
};

export function CredentialPicker({
  state,
  onStateChange,
  editingExisting,
  scopeContext,
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

  // Default mode is derived; explicit user clicks on the segmented tabs
  // pin the choice so picking "Create new credential" sticks even when
  // no fields are typed yet (without this, the derivation snaps back to
  // "saved" whenever a matching credential exists).
  const [explicitSourceMode, setExplicitSourceMode] = useState<
    "saved" | "new" | null
  >(null);

  const derivedSourceMode: "saved" | "new" =
    state.credentialId !== ""
      ? "saved"
      : Object.values(state.secretFields).some((v) => v !== "")
      ? "new"
      : matchingCredentials.length > 0
      ? "saved"
      : "new";

  const sourceMode = explicitSourceMode ?? derivedSourceMode;

  const setSourceMode = (mode: string) => {
    const next = mode as "saved" | "new";
    setExplicitSourceMode(next);
    if (next === "saved") {
      onStateChange({ ...state, secretFields: {} });
    } else {
      onStateChange({ ...state, credentialId: "" });
    }
  };

  return (
    <div className={"flex-col flex gap-6"}>
      {scopeContext === "auto-configure" && (
        <Callout variant={"warning"}>
          <span className={"flex items-start gap-2"}>
            <AlertTriangleIcon size={16} className={"shrink-0 mt-0.5"} />
            <span>
              Auto-configure requires a credential with zone-write access —
              broader than the cert-issuance scope. NetBird will be able to
              create, modify, and delete records in this zone.
            </span>
          </span>
        </Callout>
      )}

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
          {scopeContext === "auto-configure" &&
            schema.autoConfigureScopeHelper && (
              <HelpText className={"!mt-0"}>
                {schema.autoConfigureScopeHelper}
              </HelpText>
            )}

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
  );
}
