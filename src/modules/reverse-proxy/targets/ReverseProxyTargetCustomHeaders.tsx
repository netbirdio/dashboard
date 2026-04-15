"use client";

import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { MinusCircleIcon, PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const HEADER_NAME_RE = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/;
const BLOCKED_HEADERS = new Set([
  "host",
  "connection",
  "transfer-encoding",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "upgrade",
]);

type HeaderEntry = { id: number; name: string; value: string };

function recordToHeaderEntries(
  record: Record<string, string> | undefined,
  nextId: () => number,
): HeaderEntry[] {
  if (!record) return [];
  return Object.entries(record).map(([name, value]) => ({
    id: nextId(),
    name,
    value,
  }));
}

export function headerEntriesToRecord(
  entries: HeaderEntry[],
): Record<string, string> | undefined {
  if (entries.length === 0) return undefined;
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.name) record[entry.name] = entry.value;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function validateHeaderName(
  name: string,
  allNames: string[],
  t: (key: any, values?: Record<string, string | number>) => string,
): string | undefined {
  if (!name) return undefined;
  if (!HEADER_NAME_RE.test(name))
    return t("reverseProxy.headerInvalidName");
  if (BLOCKED_HEADERS.has(name.toLowerCase()))
    return t("reverseProxy.headerReserved", { name });
  const dupeCount = allNames.filter(
    (n) => n.toLowerCase() === name.toLowerCase(),
  ).length;
  if (dupeCount > 1) return t("reverseProxy.headerDuplicate");
  return undefined;
}

function validateHeaderValue(
  value: string,
  t: (key: any, values?: Record<string, string | number>) => string,
): string | undefined {
  if (value.includes("\r") || value.includes("\n"))
    return t("reverseProxy.headerLineBreaks");
  return undefined;
}

export function useCustomHeaders(initialHeaders?: Record<string, string>) {
  const { t } = useI18n();
  const [nextId] = useState(() => {
    let id = 0;
    return () => ++id;
  });

  const [headerEntries, setHeaderEntries] = useState<HeaderEntry[]>(() =>
    recordToHeaderEntries(initialHeaders, nextId),
  );

  const addHeader = useCallback(() => {
    setHeaderEntries((prev) => [
      ...prev,
      { id: nextId(), name: "", value: "" },
    ]);
  }, [nextId]);

  const removeHeader = useCallback((id: number) => {
    setHeaderEntries((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHeaderEntry = useCallback(
    (id: number, field: "name" | "value", fieldValue: string) => {
      setHeaderEntries((prev) =>
        prev.map((h) => (h.id === id ? { ...h, [field]: fieldValue } : h)),
      );
    },
    [],
  );

  const allHeaderNames = headerEntries.map((h) => h.name);
  const headerErrors = headerEntries.map((entry) => ({
    name: validateHeaderName(entry.name, allHeaderNames, t),
    value: validateHeaderValue(entry.value, t),
  }));

  const hasHeaderErrors = headerErrors.some((e) => e.name || e.value);

  return {
    headerEntries,
    setHeaderEntries,
    addHeader,
    removeHeader,
    updateHeaderEntry,
    headerErrors,
    hasHeaderErrors,
  };
}

export type CustomHeadersProps = Pick<
  ReturnType<typeof useCustomHeaders>,
  | "headerEntries"
  | "addHeader"
  | "removeHeader"
  | "updateHeaderEntry"
  | "headerErrors"
>;

export default function ReverseProxyTargetCustomHeaders({
  headerEntries,
  addHeader,
  removeHeader,
  updateHeaderEntry,
  headerErrors,
}: CustomHeadersProps) {
  const { t } = useI18n();

  return (
    <div>
      <Label>{t("reverseProxy.customHeaders")}</Label>
      <HelpText>{t("reverseProxy.customHeadersHelp")}</HelpText>
      {headerEntries.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {headerEntries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-2">
              <Input
                placeholder={t("reverseProxy.headerNamePlaceholder")}
                aria-label={t("reverseProxy.headerNameEntry", {
                  id: entry.id,
                })}
                value={entry.name}
                onChange={(e) =>
                  updateHeaderEntry(entry.id, "name", e.target.value)
                }
                maxWidthClass="flex-1"
                error={headerErrors[index]?.name}
                errorTooltip
              />
              <Input
                placeholder={t("reverseProxy.headerValuePlaceholder")}
                aria-label={t("reverseProxy.headerValueEntry", {
                  id: entry.id,
                })}
                value={entry.value}
                onChange={(e) =>
                  updateHeaderEntry(entry.id, "value", e.target.value)
                }
                maxWidthClass="flex-1"
                error={headerErrors[index]?.value}
                errorTooltip
              />
              <Button
                variant="default-outline"
                className="!px-2 shrink-0"
                onClick={() => removeHeader(entry.id)}
                aria-label={t("reverseProxy.removeHeader")}
              >
                <MinusCircleIcon size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="dotted" className="w-full" size="sm" onClick={addHeader}>
        <PlusIcon size={14} />
        {t("reverseProxy.addHeader")}
      </Button>
    </div>
  );
}
