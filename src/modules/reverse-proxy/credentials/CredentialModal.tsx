"use client";

import Button from "@components/Button";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { notify } from "@components/Notification";
import { KeyRound } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import {
  Credential,
  CredentialProviderType,
  CredentialRequest,
} from "@/interfaces/Credential";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ProviderFields } from "@/modules/reverse-proxy/cert/ProviderFields";
import {
  dnsProviders,
  getProviderSchema,
} from "@/modules/reverse-proxy/cert/providers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Undefined → create. Set → edit.
  credential?: Credential;
};

export function CredentialModal({ open, onOpenChange, credential }: Props) {
  const isEditing = !!credential;
  const { createCredential, updateCredential } = useReverseProxies();

  const [name, setName] = useState(credential?.name ?? "");
  const [providerType, setProviderType] = useState<CredentialProviderType | "">(
    credential?.provider_type ?? "",
  );
  // Secret fields are never returned from the server. Edit mode starts
  // empty; any non-empty input becomes a rotation.
  const [secretFields, setSecretFields] = useState<Record<string, string>>({});

  const schema = useMemo(
    () => getProviderSchema(providerType === "" ? undefined : providerType),
    [providerType],
  );

  const setSecretField = (key: string, value: string) => {
    setSecretFields((prev) => ({ ...prev, [key]: value }));
  };

  // For create: every required field must be filled.
  // For edit: the name+provider may be changed without secrets, so only
  // require that *if* any secret field was typed, all required fields
  // are filled (prevents partial rotation).
  const canSubmit = useMemo(() => {
    if (!name.trim() || !providerType || !schema) return false;
    const anyTyped = schema.fields.some(
      (f) => (secretFields[f.key] ?? "") !== "",
    );
    if (!isEditing) {
      return schema.fields.every(
        (f) => !f.required || (secretFields[f.key] ?? "") !== "",
      );
    }
    if (!anyTyped) return true; // name-only edit
    return schema.fields.every(
      (f) => !f.required || (secretFields[f.key] ?? "") !== "",
    );
  }, [name, providerType, schema, secretFields, isEditing]);

  const submit = async () => {
    if (!canSubmit || !providerType) return;
    const anyTyped = Object.values(secretFields).some((v) => v !== "");
    const req: CredentialRequest = {
      provider_type: providerType,
      name: name.trim(),
      // Only send secret_fields when the user actually typed something —
      // otherwise the backend keeps the existing encrypted secret.
      secret_fields: anyTyped || !isEditing ? secretFields : undefined,
    };

    const promise = isEditing
      ? updateCredential(credential.id, req)
      : createCredential(req);

    notify({
      title: req.name,
      description: isEditing
        ? "Credential was successfully updated"
        : "Credential was successfully created",
      promise: promise.then(() => onOpenChange(false)),
      loadingMessage: isEditing
        ? "Updating credential..."
        : "Creating credential...",
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"relative max-w-lg"} showClose={true}>
        <ModalHeader
          icon={<KeyRound size={20} />}
          title={isEditing ? "Edit DNS Credential" : "Add DNS Credential"}
          description={
            isEditing
              ? "Update the credential name or rotate the secret."
              : "Save a DNS provider credential to reuse across services."
          }
          color={"netbird"}
        />

        <div className={"px-8 flex flex-col gap-6 pt-6 pb-8"}>
          <div className={"flex flex-col gap-2"}>
            <Label>Name</Label>
            <Input
              autoFocus={!isEditing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={"e.g., cloudflare-prod"}
            />
          </div>

          <div className={"flex flex-col gap-2"}>
            <Label>Provider</Label>
            <Select
              value={providerType}
              onValueChange={(v) =>
                !isEditing &&
                setProviderType(v as CredentialProviderType)
              }
              disabled={isEditing}
            >
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
            <div className={"flex flex-col gap-2"}>
              <Label>Secret</Label>
              <ProviderFields
                schema={schema}
                values={secretFields}
                onChange={setSecretField}
                editingExisting={isEditing}
              />
            </div>
          )}
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
            <Button
              variant={"primary"}
              onClick={submit}
              disabled={!canSubmit}
            >
              {isEditing ? "Save Changes" : "Add Credential"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
