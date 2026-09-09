"use client";

import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Card from "@components/Card";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { Textarea } from "@components/Textarea";
import { Loader2, Play, Plus, Square, Trash2 } from "lucide-react";

const MAX_REQUEST_BODY_BYTES = 1 << 20;
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const PROTECTED_HEADERS: Record<string, true> = {
  authorization: true,
  connection: true,
  "content-length": true,
  cookie: true,
  forwarded: true,
  host: true,
  "keep-alive": true,
  "proxy-authorization": true,
  "proxy-connection": true,
  te: true,
  trailer: true,
  "transfer-encoding": true,
  upgrade: true,
};

export type PlaygroundHeaderRow = {
  id: string;
  name: string;
  value: string;
};

export type RawPlaygroundRequest = {
  method: "GET" | "POST";
  path: string;
  headers: PlaygroundHeaderRow[];
  body: string;
};

export const DEFAULT_PLAYGROUND_REQUEST: RawPlaygroundRequest = {
  method: "POST",
  path: "/v1/chat/completions",
  headers: [
    { id: "content-type", name: "Content-Type", value: "application/json" },
  ],
  body: JSON.stringify(
    {
      model: "",
      messages: [{ role: "user", content: "" }],
      stream: false,
    },
    null,
    2,
  ),
};

export function validatePlaygroundRequest(request: RawPlaygroundRequest) {
  const bodyBytes = new TextEncoder().encode(request.body).byteLength;
  if (bodyBytes > MAX_REQUEST_BODY_BYTES) {
    return "Request body must not exceed 1 MiB.";
  }
  if (!request.path.startsWith("/") || request.path.startsWith("//")) {
    return "Path must be origin-form and start with /.";
  }
  try {
    const parsed = new URL(request.path, "https://playground.invalid");
    if (parsed.origin !== "https://playground.invalid") {
      return "Path must not contain a scheme or host.";
    }
  } catch {
    return "Path is not a valid origin-form URL.";
  }
  for (const header of request.headers) {
    if (!HEADER_NAME.test(header.name)) {
      return `Header name ${header.name || "(empty)"} is invalid.`;
    }
    const lowerName = header.name.toLowerCase();
    if (PROTECTED_HEADERS[lowerName] || lowerName.startsWith("x-forwarded-")) {
      return `Header ${header.name} is managed by NetBird and cannot be set.`;
    }
    if (header.value.includes("\r") || header.value.includes("\n")) {
      return `Header ${header.name} contains an invalid line break.`;
    }
  }
  return undefined;
}

type Props = {
  value: RawPlaygroundRequest;
  onChange: (value: RawPlaygroundRequest) => void;
  disabled: boolean;
  error?: string;
  running: boolean;
  canRun: boolean;
  onRun: () => void;
  onCancel: () => void;
};

export default function PlaygroundRequestEditor({
  value,
  onChange,
  disabled,
  error,
  running,
  canRun,
  onRun,
  onCancel,
}: Readonly<Props>) {
  const updateHeader = (
    index: number,
    field: "name" | "value",
    next: string,
  ) => {
    onChange({
      ...value,
      headers: value.headers.map((header, headerIndex) =>
        headerIndex === index ? { ...header, [field]: next } : header,
      ),
    });
  };

  return (
    <section className="min-w-0" aria-labelledby="playground-request-heading">
      <Card className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nb-gray-900 px-4 py-3">
          <h2
            id="playground-request-heading"
            className="text-sm font-semibold text-nb-gray-100"
          >
            Raw request
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="primary"
              size="xs"
              disabled={!canRun}
              onClick={onRun}
            >
              {running ? (
                <Loader2 aria-hidden size={15} className="animate-spin" />
              ) : (
                <Play aria-hidden size={15} />
              )}
              Run live request
            </Button>
            {running && (
              <Button variant="danger-outline" size="xs" onClick={onCancel}>
                <Square aria-hidden size={14} /> Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-5 p-4">
          <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <div>
              <Label htmlFor="playground-method">Method</Label>
              <Select
                value={value.method}
                disabled={disabled}
                onValueChange={(method) =>
                  onChange({
                    ...value,
                    method: method as "GET" | "POST",
                  })
                }
              >
                <SelectTrigger
                  id="playground-method"
                  aria-label="Method"
                  className="font-mono"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="playground-path">Path</Label>
              <Input
                id="playground-path"
                aria-label="Path"
                className="font-mono"
                value={value.path}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...value, path: event.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label as="div">Headers</Label>
              <Button
                size="xs"
                variant="secondary"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...value,
                    headers: [
                      ...value.headers,
                      { id: crypto.randomUUID(), name: "", value: "" },
                    ],
                  })
                }
              >
                <Plus aria-hidden size={14} /> Add header
              </Button>
            </div>
            {value.headers.map((header, index) => {
              const nameID = `playground-header-name-${header.id}`;
              const valueID = `playground-header-value-${header.id}`;
              return (
                <div
                  key={header.id}
                  className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_32px]"
                >
                  <label htmlFor={nameID} className="sr-only">
                    Header {index + 1} name
                  </label>
                  <Input
                    id={nameID}
                    aria-label={`Header ${index + 1} name`}
                    className="min-w-0 font-mono"
                    value={header.name}
                    placeholder="Header name"
                    disabled={disabled}
                    onChange={(event) =>
                      updateHeader(index, "name", event.target.value)
                    }
                  />
                  <label htmlFor={valueID} className="sr-only">
                    Header {index + 1} value
                  </label>
                  <Input
                    id={valueID}
                    aria-label={`Header ${index + 1} value`}
                    className="min-w-0 font-mono"
                    value={header.value}
                    placeholder="Header value"
                    disabled={disabled}
                    onChange={(event) =>
                      updateHeader(index, "value", event.target.value)
                    }
                  />
                  <Button
                    aria-label={`Remove header ${index + 1}`}
                    variant="danger-outline"
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      onChange({
                        ...value,
                        headers: value.headers.filter(
                          (_, headerIndex) => headerIndex !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 aria-hidden size={14} />
                  </Button>
                </div>
              );
            })}
          </div>

          <div>
            <Label htmlFor="playground-body">Body</Label>
            <Textarea
              id="playground-body"
              aria-label="Body"
              className="min-h-[260px] overflow-auto font-mono text-xs leading-5"
              value={value.body}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...value, body: event.target.value })
              }
              resize
            />
            <div className="mt-1.5 text-right font-mono text-[10px] text-nb-gray-500">
              {new TextEncoder().encode(value.body).byteLength.toLocaleString()}{" "}
              / {MAX_REQUEST_BODY_BYTES.toLocaleString()} bytes
            </div>
          </div>

          {error && (
            <div role="alert">
              <Callout variant="error">{error}</Callout>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
