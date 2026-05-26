"use client";

import Code from "@components/Code";
import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
};

type Group = {
  label: string;
  entries: [string, string][];
};

const NAMESPACE_KEY_PATTERN = /^plg\.([a-z0-9_-]+)\./;

/**
 * Groups metadata entries by namespace. Keys matching the
 * `plg.<namespace>.<rest>` convention are bucketed under their namespace
 * (for example `llm`, `capture`); all remaining keys land in the
 * synthetic `other` bucket which is rendered last.
 */
function groupMetadata(entries: [string, string][]): Group[] {
  const grouped = new Map<string, [string, string][]>();
  for (const entry of entries) {
    const match = NAMESPACE_KEY_PATTERN.exec(entry[0]);
    const label = match ? match[1] : "other";
    const arr = grouped.get(label) ?? [];
    arr.push(entry);
    grouped.set(label, arr);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => {
      if (a === "other") return 1;
      if (b === "other") return -1;
      return a.localeCompare(b);
    })
    .map(([label, items]) => ({
      label,
      entries: items.sort(([a], [b]) => a.localeCompare(b)),
    }));
}

function GroupBlock({ group }: { group: Group }) {
  const json = JSON.stringify(
    Object.fromEntries(group.entries),
    null,
    2,
  );
  const heading =
    group.label === "other" ? "Other metadata" : group.label;

  return (
    <div className={"space-y-1.5"}>
      <div
        className={
          "text-[11px] font-medium uppercase tracking-wide text-nb-gray-400"
        }
      >
        {heading}
      </div>
      <Code dark small codeToCopy={json}>
        <Code.Line>{json}</Code.Line>
      </Code>
    </div>
  );
}

/**
 * ReverseProxyEventExpandedRow renders the per-request metadata as
 * grouped JSON code blocks, surfaced via the management REST API.
 */
export default function ReverseProxyEventExpandedRow({ event }: Props) {
  const entries = Object.entries(event.metadata ?? {});
  if (entries.length === 0) {
    return (
      <div
        className={
          "px-4 py-4 text-sm text-nb-gray-400 italic border-t border-nb-gray-900"
        }
      >
        No metadata recorded for this request.
      </div>
    );
  }

  const groups = groupMetadata(entries);

  return (
    <div
      className={
        "px-4 py-4 space-y-3 border-t border-nb-gray-900 bg-nb-gray-940/30"
      }
    >
      {groups.map((g) => (
        <GroupBlock key={g.label} group={g} />
      ))}
    </div>
  );
}
