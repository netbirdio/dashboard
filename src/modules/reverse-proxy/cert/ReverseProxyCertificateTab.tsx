"use client";

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
import * as React from "react";
import { useMemo } from "react";

import {
  CHALLENGE_TYPES,
  ChallengeType,
  Credential,
  CredentialProviderType,
} from "@/interfaces/Credential";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ProviderFields } from "./ProviderFields";
import { dnsProviders, getProviderSchema } from "./providers";

export type CertificateTabState = {
  challengeType: ChallengeType | "";
  dnsProvider: CredentialProviderType | "";
  // If set, the service should reference this saved credential. When
  // empty AND there is non-empty input in secretFields, the modal will
  // POST a fresh credential on save (Slice A behavior).
  credentialId: string;
  secretFields: Record<string, string>;
};

type Props = {
  state: CertificateTabState;
  onChange: (state: CertificateTabState) => void;
  // True when editing a service whose dns_credentials_ref is already
  // set. ProviderFields renders masked placeholders ("leave blank to
  // keep") in this mode.
  editingExisting: boolean;
};

export function ReverseProxyCertificateTab({
  state,
  onChange,
  editingExisting,
}: Props) {
  const { credentials } = useReverseProxies();

  const setChallenge = (value: string) => {
    const ct = value as ChallengeType;
    if (ct !== "dns-01") {
      onChange({
        challengeType: ct,
        dnsProvider: "",
        credentialId: "",
        secretFields: {},
      });
      return;
    }
    onChange({ ...state, challengeType: ct });
  };

  const setProvider = (value: string) => {
    const provider = value as CredentialProviderType;
    if (provider === state.dnsProvider) return;
    // Switching providers wipes both the saved-credential pick and the
    // inline field map (different schemas).
    onChange({
      ...state,
      dnsProvider: provider,
      credentialId: "",
      secretFields: {},
    });
  };

  const setCredentialId = (value: string) => {
    if (value === state.credentialId) return;
    onChange({ ...state, credentialId: value, secretFields: {} });
  };

  const setSecretField = (key: string, value: string) => {
    onChange({
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

  // Saved-credential mode is the default whenever the user has an
  // active credentialId, OR when there's at least one credential
  // available for the selected provider and they haven't started
  // typing fresh secrets yet.
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
      onChange({ ...state, secretFields: {} });
    } else {
      onChange({ ...state, credentialId: "" });
    }
  };

  return (
    <div className={"flex-col flex gap-6"}>
      <div className={"flex flex-col gap-2"}>
        <Label>Challenge Type</Label>
        <SegmentedTabs
          value={state.challengeType || "tls-alpn-01"}
          onChange={setChallenge}
        >
          <SegmentedTabs.List>
            {CHALLENGE_TYPES.map((c) => (
              <SegmentedTabs.Trigger key={c.id} value={c.id}>
                {c.label}
              </SegmentedTabs.Trigger>
            ))}
          </SegmentedTabs.List>
          {CHALLENGE_TYPES.map((c) => (
            <SegmentedTabs.Content key={c.id} value={c.id}>
              <HelpText className={"!mt-0"}>{c.description}</HelpText>
            </SegmentedTabs.Content>
          ))}
        </SegmentedTabs>
      </div>

      {state.challengeType === "dns-01" && (
        <>
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
        </>
      )}
    </div>
  );
}

// hasNewCredentialPayload reports whether the inline cert form has at
// least one required field filled. The modal uses this to decide
// whether to POST a fresh /credentials record on save.
export function hasNewCredentialPayload(state: CertificateTabState): boolean {
  if (state.challengeType !== "dns-01" || state.dnsProvider === "") return false;
  if (state.credentialId !== "") return false;
  const schema = getProviderSchema(state.dnsProvider);
  if (!schema) return false;
  return schema.fields.some(
    (f) => f.required && (state.secretFields[f.key] ?? "") !== "",
  );
}
