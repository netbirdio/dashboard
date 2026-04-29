"use client";

// The "Private service" flag on the parent modal drives `enabled` ON.
// Keep this component controlled so the flag can flip the toggle
// without owning state here.
//
// The inner credential picker is shared with the custom-domain
// auto-configure flow via CredentialPicker — this file is a thin
// wrapper that adds the FancyToggleSwitch around it for the cert tab.

import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { KeyRound } from "lucide-react";
import * as React from "react";

import {
  CredentialPicker,
  CredentialPickerState,
  initialCredentialPickerState,
} from "./CredentialPicker";

// Re-exported under the historical name so other modules don't need to
// rename their imports. New code should import CredentialPickerState
// from CredentialPicker directly.
export type DnsChallengeState = CredentialPickerState;
export const initialDnsChallengeState = initialCredentialPickerState;

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
      helpText="Issue certs via DNS. Required for private services and wildcard domains."
    >
      <CredentialPicker
        state={state}
        onStateChange={onStateChange}
        editingExisting={editingExisting}
        scopeContext={"cert"}
      />
    </FancyToggleSwitch>
  );
}
