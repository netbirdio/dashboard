import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Input } from "@components/Input";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  BracesIcon,
  CircleUserIcon,
  FileCode2Icon,
  KeyRoundIcon,
  MinusCircleIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import React, { useMemo, useReducer, useRef } from "react";
import { useHasChanges } from "@/hooks/useHasChanges";
import type { HeaderAuthConfig } from "@/interfaces/ReverseProxy";

type HeaderType = "basic" | "bearer" | "custom";

interface HeaderAuthItem {
  id: string;
  type: HeaderType;
  header: string;
  value: string;
  username: string;
  password: string;
  existingSecret: boolean;
}

const HEADER_TYPE_OPTIONS: SelectOption[] = [
  {
    value: "basic" satisfies HeaderType,
    label: "Basic Auth",
    icon: () => <CircleUserIcon size={14} />,
  },
  {
    value: "bearer" satisfies HeaderType,
    label: "Bearer Token",
    icon: () => <KeyRoundIcon size={14} />,
  },
  {
    value: "custom" satisfies HeaderType,
    label: "Custom Header",
    icon: () => <BracesIcon size={14} />,
  },
];

const MASKED_VALUE = "••••••••";

const INPUT_PROPS = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;

function createHeaderEntry(
  overrides?: Partial<HeaderAuthItem>,
): HeaderAuthItem {
  return {
    id: crypto.randomUUID(),
    type: "basic",
    header: "Authorization",
    value: "",
    username: "",
    password: "",
    existingSecret: false,
    ...overrides,
  };
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

function headerEntryToConfig(entry: HeaderAuthItem): HeaderAuthConfig {
  if (entry.existingSecret) {
    const value = entry.value === MASKED_VALUE ? "" : entry.value;
    return { enabled: true, header: entry.header, value };
  }
  switch (entry.type) {
    case "basic": {
      const encoded = toBase64(`${entry.username}:${entry.password}`);
      return {
        enabled: true,
        header: "Authorization",
        value: `Basic ${encoded}`,
      };
    }
    case "bearer":
      return {
        enabled: true,
        header: "Authorization",
        value: `Bearer ${entry.value}`,
      };
    case "custom":
      return { enabled: true, header: entry.header, value: entry.value };
  }
}

function configToHeaderEntry(config: HeaderAuthConfig): HeaderAuthItem {
  const isExisting = !config.value;

  if (config.header === "Authorization" && config.value?.startsWith("Basic ")) {
    try {
      const decoded = fromBase64(config.value.slice(6));
      const sep = decoded.indexOf(":");
      if (sep >= 0) {
        return createHeaderEntry({
          type: "basic",
          username: decoded.slice(0, sep),
          password: decoded.slice(sep + 1),
        });
      }
    } catch {}
  }

  if (
    config.header === "Authorization" &&
    config.value?.startsWith("Bearer ")
  ) {
    return createHeaderEntry({ type: "bearer", value: config.value.slice(7) });
  }

  return createHeaderEntry({
    type: isExisting && config.header === "Authorization" ? "basic" : "custom",
    header: config.header,
    value: isExisting ? MASKED_VALUE : config.value ?? "",
    existingSecret: isExisting,
  });
}

function isHeaderValid(entry: HeaderAuthItem): boolean {
  if (entry.existingSecret) return true;
  switch (entry.type) {
    case "basic":
      return entry.username.trim().length > 0 && entry.password.length > 0;
    case "bearer":
      return entry.value.trim().length > 0;
    case "custom":
      return entry.header.trim().length > 0 && entry.value.trim().length > 0;
  }
}

type HeaderAction =
  | { type: "add" }
  | { type: "remove"; index: number }
  | { type: "update"; index: number; updates: Partial<HeaderAuthItem> };

function headersReducer(
  state: HeaderAuthItem[],
  action: HeaderAction,
): HeaderAuthItem[] {
  switch (action.type) {
    case "add":
      return [...state, createHeaderEntry()];
    case "remove":
      return state.length === 1
        ? [createHeaderEntry()]
        : state.filter((_, i) => i !== action.index);
    case "update":
      return state.map((e, i) =>
        i === action.index ? { ...e, ...action.updates } : e,
      );
  }
}

function initHeaders(headers: HeaderAuthConfig[]): HeaderAuthItem[] {
  return headers.length > 0
    ? headers.map(configToHeaderEntry)
    : [createHeaderEntry()];
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
  const [items, dispatch] = useReducer(
    headersReducer,
    currentHeaders,
    initHeaders,
  );
  const isEditing = currentHeaders.length > 0;
  const canSave = useMemo(() => items.every(isHeaderValid), [items]);
  const { hasChanges } = useHasChanges(items);

  const handleSave = () => {
    if (!canSave) return;
    onOpenChange(false);
    onSave(items.map(headerEntryToConfig));
  };

  const handleRemoveAll = () => {
    onOpenChange(false);
    onRemove();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        maxWidthClass="max-w-xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const container = e.currentTarget as HTMLElement | null;
          container
            ?.querySelector<HTMLInputElement>("input:not([type=hidden])")
            ?.focus();
        }}
      >
        <ModalHeader
          title="HTTP Headers"
          description="Require specific HTTP headers to access this service."
        />

        <div className="px-8">
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <HeaderItemRow
                key={item.id}
                item={item}
                index={index}
                onChange={(updates) =>
                  dispatch({ type: "update", index, updates })
                }
                onRemove={() => dispatch({ type: "remove", index })}
                showRemove={items.length > 1}
              />
            ))}
          </div>

          <Button
            variant="dotted"
            className="w-full mt-4"
            size="sm"
            onClick={() => dispatch({ type: "add" })}
          >
            <PlusIcon size={14} />
            Add Header
          </Button>

          {items.length > 1 && (
            <Callout className="mt-4" variant="info">
              Any request matching one of these headers will grant access.
              <br />
              Matched headers are stripped before reaching your backend.
            </Callout>
          )}

          <div className="flex gap-3 w-full justify-between mt-6">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemoveAll}>
                  Remove All
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!canSave || !hasChanges}
                  >
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
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!canSave}
                  >
                    Add Headers
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

type HeaderItemRowProps = {
  item: HeaderAuthItem;
  index: number;
  onChange: (updates: Partial<HeaderAuthItem>) => void;
  onRemove: () => void;
  showRemove: boolean;
};

function HeaderItemRow({
  item,
  index,
  onChange,
  onRemove,
  showRemove,
}: Readonly<HeaderItemRowProps>) {
  const isMaskedRef = useRef(item.existingSecret);

  const handleHeaderTypeChange = (value: string) => {
    const type = value as HeaderType;
    onChange({
      type,
      header: type === "custom" ? "" : "Authorization",
      value: "",
      username: "",
      password: "",
    });
  };

  return (
    <div className="rounded-md border border-nb-gray-900 bg-nb-gray-920/30 overflow-hidden">
      <div className="flex flex-col gap-2 px-4 pt-2 pb-4 bg-nb-gray-920/30">
        <div className="flex items-center justify-between h-6 mt-0.5">
          <span className="text-xs font-normal text-nb-gray-200 flex items-center gap-2">
            <FileCode2Icon size={14} />
            {item.existingSecret
              ? `Header ${index + 1} - ${item.header}`
              : `Header ${index + 1}`}
          </span>
          {showRemove && (
            <Button variant="danger-text" size="xs" onClick={onRemove}>
              <MinusCircleIcon size={12} />
              Remove
            </Button>
          )}
        </div>
        {item.existingSecret ? (
          <div>
            <Input
              customPrefix={<span className="min-w-[38px]">Value</span>}
              type="password"
              showPasswordToggle={!isMaskedRef.current}
              value={isMaskedRef.current ? MASKED_VALUE : item.value}
              placeholder="e.g., AIiaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"
              {...INPUT_PROPS}
              onChange={(e) => {
                if (isMaskedRef.current) {
                  isMaskedRef.current = false;
                  const nativeEvent = e.nativeEvent as InputEvent;
                  onChange({ value: nativeEvent.data ?? "" });
                  return;
                }
                onChange({ value: e.target.value });
              }}
            />
          </div>
        ) : (
          <>
            <SelectDropdown
              value={item.type}
              onChange={handleHeaderTypeChange}
              options={HEADER_TYPE_OPTIONS}
            />

            {item.type === "basic" && (
              <div className="flex flex-col gap-2">
                <Input
                  customPrefix={<UserIcon size={16} />}
                  placeholder="Username"
                  maxWidthClass="w-full"
                  value={item.username}
                  onChange={(e) => onChange({ username: e.target.value })}
                  {...INPUT_PROPS}
                />
                <Input
                  customPrefix={<KeyRoundIcon size={16} />}
                  placeholder="Password"
                  maxWidthClass="w-full"
                  value={item.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  type="password"
                  showPasswordToggle
                  {...INPUT_PROPS}
                />
              </div>
            )}

            {item.type === "bearer" && (
              <Input
                customPrefix={"Bearer"}
                placeholder="e.g. eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                maxWidthClass="w-full"
                value={item.value}
                onChange={(e) => onChange({ value: e.target.value })}
                type="password"
                showPasswordToggle
                {...INPUT_PROPS}
              />
            )}

            {item.type === "custom" && (
              <div className="flex flex-col gap-2">
                <Input
                  customPrefix={<span className="min-w-[38px]">Name</span>}
                  placeholder="e.g., X-API-Key"
                  maxWidthClass="w-full"
                  value={item.header}
                  onChange={(e) => onChange({ header: e.target.value })}
                  {...INPUT_PROPS}
                />
                <Input
                  customPrefix={<span className="min-w-[38px]">Value</span>}
                  placeholder="e.g., AIiaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"
                  maxWidthClass="w-full"
                  value={item.value}
                  onChange={(e) => onChange({ value: e.target.value })}
                  type="password"
                  showPasswordToggle
                  {...INPUT_PROPS}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
