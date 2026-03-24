import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import {
  BracesIcon,
  CircleUserIcon,
  KeyRoundIcon,
  MinusCircleIcon,
  PlusIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { HeaderAuthConfig } from "@/interfaces/ReverseProxy";

enum AuthType {
  Basic = "basic",
  Bearer = "bearer",
  Custom = "custom",
}

const authTypeOptions = [
  {
    value: AuthType.Basic,
    label: "Basic Auth",
    icon: () => <CircleUserIcon size={14} />,
  },
  {
    value: AuthType.Bearer,
    label: "Bearer Token",
    icon: () => <KeyRoundIcon size={14} />,
  },
  {
    value: AuthType.Custom,
    label: "Custom Header",
    icon: () => <BracesIcon size={14} />,
  },
] as SelectOption[];

/**
 * Internal state per header entry. The UI lets users pick an auth type,
 * then we convert to the API's flat { header, value } on save.
 */
interface HeaderEntry {
  authType: AuthType;
  username: string;
  password: string;
  token: string;
  headerName: string;
  headerValue: string;
}

const emptyEntry = (): HeaderEntry => ({
  authType: AuthType.Basic,
  username: "",
  password: "",
  token: "",
  headerName: "",
  headerValue: "",
});

/**
 * Convert an API HeaderAuthConfig into our internal form state.
 * We detect the auth type from the header/value format.
 */
function fromApi(cfg: HeaderAuthConfig): HeaderEntry {
  if (
    cfg.header.toLowerCase() === "authorization" &&
    cfg.value.startsWith("Basic ")
  ) {
    let username = "";
    let password = "";
    try {
      const decoded = atob(cfg.value.substring(6));
      const colonIdx = decoded.indexOf(":");
      if (colonIdx !== -1) {
        username = decoded.substring(0, colonIdx);
        password = decoded.substring(colonIdx + 1);
      }
    } catch {
      // keep empty
    }
    return {
      authType: AuthType.Basic,
      username,
      password,
      token: "",
      headerName: "",
      headerValue: "",
    };
  }
  if (
    cfg.header.toLowerCase() === "authorization" &&
    cfg.value.startsWith("Bearer ")
  ) {
    return {
      authType: AuthType.Bearer,
      username: "",
      password: "",
      token: cfg.value.substring(7),
      headerName: "",
      headerValue: "",
    };
  }
  return {
    authType: AuthType.Custom,
    username: "",
    password: "",
    token: "",
    headerName: cfg.header,
    headerValue: cfg.value,
  };
}

/** Convert our internal form state to the API format. */
function toApi(entry: HeaderEntry): HeaderAuthConfig | null {
  switch (entry.authType) {
    case AuthType.Basic: {
      if (!entry.username.trim() || !entry.password.trim()) return null;
      const encoded = btoa(`${entry.username}:${entry.password}`);
      return {
        enabled: true,
        header: "Authorization",
        value: `Basic ${encoded}`,
      };
    }
    case AuthType.Bearer: {
      if (!entry.token.trim()) return null;
      return {
        enabled: true,
        header: "Authorization",
        value: `Bearer ${entry.token}`,
      };
    }
    case AuthType.Custom: {
      if (!entry.headerName.trim() || !entry.headerValue.trim()) return null;
      return {
        enabled: true,
        header: entry.headerName,
        value: entry.headerValue,
      };
    }
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentHeaders: HeaderAuthConfig[];
  isEnabled: boolean;
  onSave: (headers: HeaderAuthConfig[]) => void;
  onRemove: () => void;
};

export default function AuthHeaderModal({
  open,
  onOpenChange,
  currentHeaders,
  isEnabled,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const [entries, setEntries] = useState<HeaderEntry[]>(
    currentHeaders.length > 0 ? currentHeaders.map(fromApi) : [emptyEntry()],
  );
  const isEditing = isEnabled;

  const canSave = useMemo(() => {
    return entries.some((e) => toApi(e) !== null);
  }, [entries]);

  const handleSave = () => {
    if (!canSave) return;
    const configs = entries
      .map(toApi)
      .filter((c): c is HeaderAuthConfig => c !== null);
    onOpenChange(false);
    onSave(configs);
  };

  const handleRemove = () => {
    onOpenChange(false);
    onRemove();
  };

  const addEntry = () => {
    setEntries([...entries, emptyEntry()]);
  };

  const updateEntry = (index: number, updates: Partial<HeaderEntry>) => {
    setEntries(
      entries.map((e, i) => (i === index ? { ...e, ...updates } : e)),
    );
  };

  const removeEntry = (index: number) => {
    if (entries.length === 1) {
      setEntries([emptyEntry()]);
      return;
    }
    setEntries(entries.filter((_, i) => i !== index));
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-xl">
        <ModalHeader
          title="HTTP Headers"
          description="Require specific HTTP headers to access this service."
        />

        <GradientFadedBackground />

        <div className="px-8">
          <div className="flex flex-col gap-4">
            {entries.map((entry, index) => (
              <HeaderEntryRow
                key={index}
                entry={entry}
                onChange={(updates) => updateEntry(index, updates)}
                onRemove={() => removeEntry(index)}
                showRemove={entries.length > 1}
              />
            ))}
          </div>

          <Button
            variant="dotted"
            className="w-full mt-4"
            size="sm"
            onClick={addEntry}
          >
            <PlusIcon size={14} />
            Add Header
          </Button>

          <div className="flex gap-3 w-full justify-between mt-6">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemove}>
                  Remove
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!canSave}
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

type HeaderEntryRowProps = {
  entry: HeaderEntry;
  onChange: (updates: Partial<HeaderEntry>) => void;
  onRemove: () => void;
  showRemove: boolean;
};

function HeaderEntryRow({
  entry,
  onChange,
  onRemove,
  showRemove,
}: Readonly<HeaderEntryRowProps>) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-md border border-nb-gray-800 bg-nb-gray-950/50">
      <div className="flex gap-2 items-center">
        <div className="w-full">
          <SelectDropdown
            value={entry.authType}
            onChange={(value) =>
              onChange({
                authType: value as AuthType,
                username: "",
                password: "",
                token: "",
                headerName: "",
                headerValue: "",
              })
            }
            options={authTypeOptions}
          />
        </div>
        {showRemove && (
          <Button
            className="h-[42px] shrink-0"
            variant="default-outline"
            onClick={onRemove}
          >
            <MinusCircleIcon size={15} />
          </Button>
        )}
      </div>

      {entry.authType === AuthType.Basic && (
        <div className="flex flex-col gap-2 mt-1">
          <Input
            customPrefix={<UserIcon size={16} />}
            placeholder="Username"
            maxWidthClass="w-full"
            value={entry.username}
            onChange={(e) => onChange({ username: e.target.value })}
          />
          <Input
            customPrefix={<KeyRoundIcon size={16} />}
            placeholder="Password"
            maxWidthClass="w-full"
            value={entry.password}
            onChange={(e) => onChange({ password: e.target.value })}
            type="password"
          />
        </div>
      )}

      {entry.authType === AuthType.Bearer && (
        <div className="flex flex-col gap-2 mt-1">
          <Input
            customPrefix={"Bearer"}
            placeholder="e.g. eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
            maxWidthClass="w-full"
            value={entry.token}
            onChange={(e) => onChange({ token: e.target.value })}
            type="password"
          />
        </div>
      )}

      {entry.authType === AuthType.Custom && (
        <div className="flex flex-col gap-2 mt-1">
          <div>
            <Label>Header Name & Value</Label>
            <HelpText>
              Specify the header name and value for custom authentication.
            </HelpText>
          </div>
          <Input
            customPrefix={<TagIcon size={16} />}
            placeholder="e.g., X-API-Key"
            maxWidthClass="w-full"
            value={entry.headerName}
            onChange={(e) => onChange({ headerName: e.target.value })}
          />
          <Input
            customPrefix={<KeyRoundIcon size={16} />}
            placeholder="e.g., AIiaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe"
            maxWidthClass="w-full"
            value={entry.headerValue}
            onChange={(e) => onChange({ headerValue: e.target.value })}
            type="password"
          />
        </div>
      )}
    </div>
  );
}
