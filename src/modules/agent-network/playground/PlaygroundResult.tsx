"use client";

import Badge from "@components/Badge";
import { Callout } from "@components/Callout";
import Card from "@components/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Loader2 } from "lucide-react";
import { PlaygroundResponse } from "./api";

type Props = {
  result?: PlaygroundResponse;
  running: boolean;
  error?: string;
};

function Value({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <dd className="min-w-0 break-all font-mono text-xs text-nb-gray-250">
      {children || "—"}
    </dd>
  );
}

function ResponseBody({
  result,
  running,
}: Readonly<{ result?: PlaygroundResponse; running: boolean }>) {
  const body = result?.body || "(empty)";
  const lines = body.split("\n");

  return (
    <TabsContent value="body" className="mt-0 min-h-0 flex-1 pt-0 outline-none">
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        {result?.body_truncated && (
          <div role="alert">
            <Callout variant="warning">
              Response exceeded 8 MiB. Only the returned prefix is shown.
            </Callout>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-nb-gray-500">
            Response body
          </span>
          <span className="font-mono text-[10px] uppercase text-nb-gray-500">
            {result?.body_encoding || "—"}
          </span>
        </div>
        <div className="min-h-64 min-w-0 flex-1 overflow-auto rounded-md border border-nb-gray-900 bg-nb-gray-950 py-3">
          {running && !result ? (
            <div className="flex h-full min-h-56 items-center justify-center gap-2 text-sm text-nb-gray-500">
              <Loader2 aria-hidden size={16} className="animate-spin" />
              Waiting for response…
            </div>
          ) : (
            <div className="min-w-max font-mono text-xs leading-5 text-nb-gray-250">
              {lines.map((line, index) => (
                <div
                  key={`${index}-${line}`}
                  className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)]"
                >
                  <span
                    aria-hidden
                    className="select-none border-r border-nb-gray-900 pr-3 text-right text-nb-gray-700"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap break-all px-3">
                    {line || <span aria-hidden>&nbsp;</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}

function ResponseHeaders({
  result,
}: Readonly<{ result?: PlaygroundResponse }>) {
  const headers =
    result?.headers.flatMap((header) =>
      header.values.map((value) => ({ name: header.name, value })),
    ) ?? [];

  return (
    <TabsContent
      value="headers"
      className="mt-0 min-h-0 flex-1 pt-0 outline-none"
    >
      <div className="h-full min-h-64 overflow-auto p-4">
        {headers.length ? (
          <div className="overflow-hidden rounded-md border border-nb-gray-900">
            {headers.map((header, index) => (
              <div
                key={`${header.name}-${index}`}
                className="grid min-w-0 gap-1 border-b border-nb-gray-900 bg-nb-gray-950 px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(8rem,0.65fr)_minmax(0,1fr)] sm:gap-4"
              >
                <span
                  className={`break-all font-mono text-xs ${
                    header.name.toLowerCase().startsWith("x-netbird-")
                      ? "text-netbird"
                      : "text-nb-gray-400"
                  }`}
                >
                  {header.name}
                </span>
                <span className="min-w-0 break-all font-mono text-xs text-nb-gray-250">
                  {header.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-nb-gray-900 bg-nb-gray-950 px-3 py-4 font-mono text-xs text-nb-gray-500">
            (none)
          </div>
        )}
      </div>
    </TabsContent>
  );
}

function ResponseDetails({
  result,
}: Readonly<{ result?: PlaygroundResponse }>) {
  const groups =
    result?.identity.group_names
      .map(
        (name, index) => `${name} (${result.identity.group_ids[index] ?? "?"})`,
      )
      .join(", ") || result?.identity.group_ids.join(", ");

  return (
    <TabsContent
      value="details"
      className="mt-0 min-h-0 flex-1 pt-0 outline-none"
    >
      <div className="grid gap-6 overflow-auto p-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-nb-gray-400">
            Authoritative identity
          </h3>
          <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2.5">
            <dt className="text-xs text-nb-gray-500">User ID</dt>
            <Value>{result?.identity.user_id}</Value>
            <dt className="text-xs text-nb-gray-500">User email</dt>
            <Value>{result?.identity.user_email}</Value>
            <dt className="text-xs text-nb-gray-500">Groups</dt>
            <Value>{groups}</Value>
          </dl>
        </div>

        <div className="min-w-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-nb-gray-400">
            Policy attribution
          </h3>
          <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5">
            <dt className="text-xs text-nb-gray-500">Reason</dt>
            <Value>{result?.policy.reason}</Value>
            <dt className="text-xs text-nb-gray-500">Provider surface</dt>
            <Value>{result?.policy.provider_surface}</Value>
            <dt className="text-xs text-nb-gray-500">Model</dt>
            <Value>{result?.policy.model}</Value>
            <dt className="text-xs text-nb-gray-500">Resolved provider</dt>
            <Value>{result?.policy.resolved_provider_id}</Value>
            <dt className="text-xs text-nb-gray-500">Selected policy</dt>
            <Value>{result?.policy.selected_policy_id}</Value>
            <dt className="text-xs text-nb-gray-500">Attribution group</dt>
            <Value>{result?.policy.attribution_group_id}</Value>
            <dt className="text-xs text-nb-gray-500">Authorising groups</dt>
            <Value>{result?.policy.authorising_group_ids.join(", ")}</Value>
          </dl>
        </div>
      </div>
    </TabsContent>
  );
}

export default function PlaygroundResult({
  result,
  running,
  error,
}: Readonly<Props>) {
  const visibleResult = error ? undefined : result;
  const allowed = visibleResult?.policy.decision === "allow";
  const providerLabel = visibleResult
    ? [
        visibleResult.policy.resolved_provider_id,
        visibleResult.policy.provider_surface,
        visibleResult.policy.model,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const status = error
    ? "Request failed"
    : running
    ? "Sending request…"
    : visibleResult
    ? `HTTP ${visibleResult.status_code}`
    : "Not run";

  return (
    <section
      aria-label="Response inspector"
      aria-live="polite"
      aria-busy={running}
      className="h-full min-h-80 min-w-0"
    >
      <Card className="flex h-full min-h-80 w-full flex-col">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-nb-gray-900 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-nb-gray-100">Response</h2>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              {running && (
                <Loader2
                  aria-hidden
                  size={14}
                  className="shrink-0 animate-spin text-netbird"
                />
              )}
              <span
                className={`font-mono text-xs font-medium ${
                  error ? "text-red-400" : "text-nb-gray-100"
                }`}
              >
                {status}
              </span>
              {visibleResult && !error && (
                <Badge size="xs" variant={allowed ? "green" : "red"}>
                  {visibleResult.policy.decision || "unknown"}
                </Badge>
              )}
            </div>
          </div>
          {visibleResult && !error && (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-[10px] uppercase text-nb-gray-500">
              <span>{visibleResult.body_encoding}</span>
              {providerLabel && (
                <span className="max-w-full break-all normal-case">
                  {providerLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {error ? (
          <div className="flex min-h-64 flex-1 items-start p-4">
            <div role="alert" className="w-full">
              <Callout variant="error">{error}</Callout>
            </div>
          </div>
        ) : (
          <Tabs
            defaultValue="body"
            className={`flex min-h-0 flex-1 flex-col transition-opacity ${
              running && visibleResult ? "opacity-50" : ""
            }`}
          >
            <TabsList
              aria-label="Response views"
              justify="start"
              className="shrink-0 px-4 pt-3"
            >
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <ResponseBody result={visibleResult} running={running} />
            <ResponseHeaders result={visibleResult} />
            <ResponseDetails result={visibleResult} />
          </Tabs>
        )}
      </Card>
    </section>
  );
}
