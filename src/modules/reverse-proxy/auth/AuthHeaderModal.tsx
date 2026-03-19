import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import type { HeaderAuthConfig } from "@/interfaces/ReverseProxy";
import { MinusCircleIcon, PlusCircle } from "lucide-react";
import React, { useMemo, useState } from "react";

type Preset = "basic" | "bearer" | "custom";

let nextDraftId = 0;

type DraftEntry = {
  id: number;
  preset: Preset;
  header: string;
  value: string;
  // Basic auth convenience fields
  username: string;
  password: string;
  // True when loaded from an existing config (value is hidden server-side).
  // The entry is valid without re-entering the value.
  existingSecret: boolean;
};

function newDraft(): DraftEntry {
  return { id: nextDraftId++, preset: "basic", header: "Authorization", value: "", username: "", password: "", existingSecret: false };
}

function toBase64(str: string): string {
  return btoa(
    new TextEncoder()
      .encode(str)
      .reduce((acc, byte) => acc + String.fromCharCode(byte), ""),
  );
}

function fromBase64(b64: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
  );
}

function draftToConfig(d: DraftEntry): HeaderAuthConfig {
  // Existing secret that wasn't re-entered: send empty value so backend keeps the hash.
  if (d.existingSecret) {
    return { enabled: true, header: d.header, value: "" };
  }
  if (d.preset === "basic") {
    const encoded = toBase64(`${d.username}:${d.password}`);
    return { enabled: true, header: "Authorization", value: `Basic ${encoded}` };
  }
  if (d.preset === "bearer") {
    return { enabled: true, header: "Authorization", value: `Bearer ${d.value}` };
  }
  return { enabled: true, header: d.header, value: d.value };
}

function configToDraft(c: HeaderAuthConfig): DraftEntry {
  // When the API returns headers without values (secrets are stripped),
  // mark them as existing so we don't require re-entry.
  const isExisting = !c.value;
  if (c.header === "Authorization" && c.value?.startsWith("Basic ")) {
    try {
      const decoded = fromBase64(c.value.slice(6));
      const sep = decoded.indexOf(":");
      if (sep >= 0) {
        return {
          id: nextDraftId++,
          preset: "basic",
          header: "Authorization",
          value: "",
          username: decoded.slice(0, sep),
          password: decoded.slice(sep + 1),
          existingSecret: false,
        };
      }
    } catch {
      // fall through to custom
    }
  }
  if (c.header === "Authorization" && c.value?.startsWith("Bearer ")) {
    return {
      id: nextDraftId++,
      preset: "bearer",
      header: "Authorization",
      value: c.value.slice(7),
      username: "",
      password: "",
      existingSecret: false,
    };
  }
  // For existing entries without a value, guess the preset from the header name.
  const preset: Preset = isExisting && c.header === "Authorization" ? "basic" : "custom";
  return {
    id: nextDraftId++,
    preset,
    header: c.header,
    value: c.value ?? "",
    username: "",
    password: "",
    existingSecret: isExisting,
  };
}

function isDraftValid(d: DraftEntry): boolean {
  // An existing entry with unchanged secret is always valid.
  if (d.existingSecret) return true;
  if (d.preset === "basic") {
    return d.username.trim().length > 0 && d.password.length > 0;
  }
  if (d.preset === "bearer") {
    return d.value.trim().length > 0;
  }
  return d.header.trim().length > 0 && d.value.trim().length > 0;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHeaders: HeaderAuthConfig[];
  onSave: (headers: HeaderAuthConfig[]) => void;
  onRemove: () => void;
};

export default function AuthHeaderModal({
  open,
  onOpenChange,
  currentHeaders,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const [drafts, setDrafts] = useState<DraftEntry[]>(() =>
    currentHeaders.length > 0 ? currentHeaders.map(configToDraft) : [newDraft()],
  );

  const isEditing = currentHeaders.length > 0;

  const allValid = useMemo(() => drafts.every(isDraftValid), [drafts]);

  const updateDraft = (index: number, update: Partial<DraftEntry>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...update } : d)));
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const addDraft = () => {
    setDrafts((prev) => [...prev, newDraft()]);
  };

  const handleSave = () => {
    if (!allValid) return;
    onOpenChange(false);
    onSave(drafts.map(draftToConfig));
  };

  const handleRemove = () => {
    onOpenChange(false);
    onRemove();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-lg">
        <ModalHeader
          title="Header Authentication"
          description="Authenticate requests using HTTP headers. Multiple entries are treated as alternatives: any one matching grants access."
        />

        <GradientFadedBackground />

        <div className="px-8 flex flex-col gap-4">
          {drafts.map((draft, index) => (
            <div
              key={draft.id}
              className="border border-nb-gray-920 rounded-md p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <Label>
                  {drafts.length > 1 ? `Header ${index + 1}` : "Header"}
                </Label>
                {drafts.length > 1 && (
                  <Button
                    variant="danger-text"
                    size="xs"
                    onClick={() => removeDraft(index)}
                  >
                    <MinusCircleIcon size={14} />
                    Remove
                  </Button>
                )}
              </div>

              {!draft.existingSecret && <div>
                <HelpText margin={false}>Type</HelpText>
                <Select
                  value={draft.preset}
                  onValueChange={(val) => {
                    const preset = val as Preset;
                    const updates: Partial<DraftEntry> = { preset };
                    if (preset === "basic" || preset === "bearer") {
                      updates.header = "Authorization";
                    } else {
                      updates.header = "";
                    }
                    updates.value = "";
                    updates.username = "";
                    updates.password = "";
                    updateDraft(index, updates);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Auth (username + password)</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="custom">Custom Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>}

              {draft.existingSecret ? (
                <div>
                  <HelpText margin={false}>
                    Header: <code>{draft.header}</code>
                  </HelpText>
                  <p className="text-xs text-nb-gray-400 mt-1 mb-2">
                    Value is configured. Enter a new value below to change it, or leave empty to keep the current one.
                  </p>
                  <Input
                    className="mt-1"
                    type="password"
                    showPasswordToggle
                    placeholder="Enter new value to replace..."
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    onChange={(e) => {
                      if (e.target.value) {
                        updateDraft(index, {
                          existingSecret: false,
                          preset: "custom",
                          value: e.target.value,
                        });
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  {draft.preset === "basic" && (
                    <>
                      <div>
                        <HelpText margin={false}>Username</HelpText>
                        <Input
                          className="mt-1"
                          value={draft.username}
                          onChange={(e) => updateDraft(index, { username: e.target.value })}
                          placeholder="admin"
                          autoComplete="off"
                          data-1p-ignore
                        />
                      </div>
                      <div>
                        <HelpText margin={false}>Password</HelpText>
                        <Input
                          className="mt-1"
                          type="password"
                          value={draft.password}
                          showPasswordToggle
                          onChange={(e) => updateDraft(index, { password: e.target.value })}
                          placeholder="Enter password..."
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                        />
                      </div>
                    </>
                  )}

                  {draft.preset === "bearer" && (
                    <div>
                      <HelpText margin={false}>Token</HelpText>
                      <Input
                        className="mt-1"
                        type="password"
                        value={draft.value}
                        showPasswordToggle
                        onChange={(e) => updateDraft(index, { value: e.target.value })}
                        placeholder="Enter bearer token..."
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                    </div>
                  )}

                  {draft.preset === "custom" && (
                    <>
                      <div>
                        <HelpText margin={false}>Header Name</HelpText>
                        <Input
                          className="mt-1"
                          value={draft.header}
                          onChange={(e) => updateDraft(index, { header: e.target.value })}
                          placeholder="X-API-Key"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <HelpText margin={false}>Header Value</HelpText>
                        <Input
                          className="mt-1"
                          type="password"
                          value={draft.value}
                          showPasswordToggle
                          onChange={(e) => updateDraft(index, { value: e.target.value })}
                          placeholder="Enter expected value..."
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))}

          <Button
            variant="secondaryLighter"
            size="xs"
            className="self-start"
            onClick={addDraft}
          >
            <PlusCircle size={14} />
            Add Another Header
          </Button>

          <p className="text-xs text-nb-gray-400">
            When multiple headers are configured, a request matching any one of them will be granted access.
            Each header is stripped before forwarding to the backend.
          </p>

          <div className="flex gap-3 w-full justify-between mt-2">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemove}>
                  Remove All
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button variant="primary" onClick={handleSave} disabled={!allValid}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button variant="primary" onClick={handleSave} disabled={!allValid}>
                    Add Header Auth
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
