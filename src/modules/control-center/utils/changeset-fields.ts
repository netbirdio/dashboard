import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import {
  ChangeKind,
  DraftChange,
  getChangeKind,
} from "@/modules/control-center/draft/DraftChangesetContext";
import { LiveData } from "@/modules/control-center/utils/changeset-request";

// The Visual view is a before→after field summary — no code. Each change maps
// to a small, human-readable field list; the view shows changed fields as
// `before → after` (unchanged fields hidden), a create as all-added, a delete
// as all-removed. Values here read like the UI, not the wire (group NAMES, not
// ids) — the code view already covers the exact request.

export interface FieldRow {
  label: string;
  // A create fills `after`; a delete fills `before`; an update fills whichever
  // changed. A row with both is a modification.
  before?: string;
  after?: string;
}

export interface ChangeVisual {
  entity: string;
  kind: ChangeKind;
  // Empty when there is nothing to summarize beyond the header (rare).
  rows: FieldRow[];
  // Set for install-peer (not an API change) — the view renders a note.
  note?: string;
}

export interface FieldLiveData extends LiveData {
  peers?: Peer[];
}

const EMPTY = "—";

const groupName = (ref: Group | string, live: FieldLiveData): string => {
  if (typeof ref !== "string") return ref.name;
  return live.groups?.find((g) => g.id === ref)?.name ?? ref;
};

const peerName = (id: string, live: FieldLiveData): string =>
  live.peers?.find((p) => p.id === id)?.name ?? id;

const resourceName = (id: string, live: FieldLiveData): string =>
  live.networkResources?.find((r) => r.id === id)?.name ?? id;

const joinOrNone = (items: string[]): string =>
  items.length > 0 ? items.join(", ") : "None";

// Ordered display fields for a policy — shared by create/update/delete so a
// modification diffs like-for-like.
const policyFields = (policy: Policy, live: FieldLiveData): FieldRow[] => {
  const rule = policy.rules?.[0];
  const groupNames = (list?: (Group | string)[] | null) =>
    joinOrNone(((list as (Group | string)[]) ?? []).map((g) => groupName(g, live)));

  const source = rule?.sourceResource ? "Resource" : groupNames(rule?.sources);
  const destination = rule?.destinationResource
    ? "Resource"
    : groupNames(rule?.destinations);
  const ports = rule?.ports?.length ? rule.ports.join(", ") : "Any";

  const rows: FieldRow[] = [
    { label: "Sources", after: source },
    { label: "Destination", after: destination },
    { label: "Protocol", after: rule?.protocol ?? "all" },
    { label: "Ports", after: ports },
    { label: "Direction", after: rule?.bidirectional ? "Bidirectional" : "One-way" },
    { label: "Enabled", after: policy.enabled ? "Yes" : "No" },
  ];
  if (policy.description) rows.push({ label: "Description", after: policy.description });
  return rows;
};

const resourceFields = (
  data: { name: string; address: string; enabled: boolean; groups: string[]; description?: string },
  networkName: string,
  live: FieldLiveData,
): FieldRow[] => {
  const rows: FieldRow[] = [
    { label: "Name", after: data.name },
    { label: "Address", after: data.address },
    { label: "Network", after: networkName },
    { label: "Groups", after: joinOrNone(data.groups.map((g) => groupName(g, live))) },
    { label: "Enabled", after: data.enabled ? "Yes" : "No" },
  ];
  if (data.description) rows.push({ label: "Description", after: data.description });
  return rows;
};

// Turn an "after-only" field list into a before/after diff against a "before"
// list, keeping only rows whose value changed. Missing on one side reads as a
// pure add/remove for that field.
const diffFieldLists = (before: FieldRow[], after: FieldRow[]): FieldRow[] => {
  const beforeByLabel = new Map(before.map((r) => [r.label, r.after]));
  const afterByLabel = new Map(after.map((r) => [r.label, r.after]));
  const labels = [
    ...after.map((r) => r.label),
    ...before.filter((r) => !afterByLabel.has(r.label)).map((r) => r.label),
  ];
  const rows: FieldRow[] = [];
  labels.forEach((label) => {
    const b = beforeByLabel.get(label);
    const a = afterByLabel.get(label);
    if (b === a) return;
    rows.push({ label, before: b, after: a });
  });
  return rows;
};

const entityFor = (change: DraftChange): string => {
  switch (change.type) {
    case "create-group":
    case "update-group":
    case "delete-group":
      return "Group";
    case "create-policy":
    case "update-policy":
    case "delete-policy":
      return "Policy";
    case "create-network":
      return "Network";
    case "create-resource":
    case "update-resource":
    case "delete-resource":
      return "Resource";
    case "create-router":
      return "Routing peer";
    case "install-peer":
      return "Peer";
  }
};

export function getChangeVisual(
  change: DraftChange,
  live: FieldLiveData,
): ChangeVisual {
  const base = { entity: entityFor(change), kind: getChangeKind(change) };

  switch (change.type) {
    case "create-policy":
      return { ...base, rows: policyFields(change.policy, live) };
    case "delete-policy": {
      const policy = live.policies?.find((p) => p.id === change.policyId);
      const rows = policy
        ? policyFields(policy, live).map((r) => ({ label: r.label, before: r.after }))
        : [];
      return { ...base, rows };
    }
    case "update-policy": {
      const policy = live.policies?.find((p) => p.id === change.policyId);
      const after = policyFields(change.policy, live);
      const before = policy ? policyFields(policy, live) : [];
      return { ...base, rows: diffFieldLists(before, after) };
    }

    case "create-group": {
      const members = [
        ...change.peerIds.map((id) => peerName(id, live)),
        ...change.resourceIds.map((id) => resourceName(id, live)),
      ];
      return {
        ...base,
        rows: [
          { label: "Name", after: change.name },
          { label: "Members", after: joinOrNone(members) },
        ],
      };
    }
    case "delete-group":
      return { ...base, rows: [{ label: "Name", before: change.name }] };
    case "update-group": {
      const added = [
        ...change.peerIds.map((id) => peerName(id, live)),
        ...change.resourceIds.map((id) => resourceName(id, live)),
      ];
      const removed = [
        ...(change.removedPeerIds ?? []).map((id) => peerName(id, live)),
        ...(change.removedResourceIds ?? []).map((id) => resourceName(id, live)),
      ];
      const rows: FieldRow[] = [];
      if (change.name !== change.originalName)
        rows.push({ label: "Name", before: change.originalName, after: change.name });
      if (added.length > 0) rows.push({ label: "Added members", after: added.join(", ") });
      if (removed.length > 0)
        rows.push({ label: "Removed members", before: removed.join(", ") });
      return { ...base, rows };
    }

    case "create-network": {
      const rows: FieldRow[] = [{ label: "Name", after: change.name }];
      if (change.description) rows.push({ label: "Description", after: change.description });
      return { ...base, rows };
    }

    case "create-resource":
      return {
        ...base,
        rows: resourceFields(
          {
            name: change.name,
            address: change.address,
            enabled: change.enabled ?? true,
            groups: change.groupIds,
            description: change.description,
          },
          change.networkName,
          live,
        ),
      };
    case "delete-resource": {
      const resource = live.networkResources?.find((r) => r.id === change.resourceId);
      const rows: FieldRow[] = [
        { label: "Name", before: change.name },
        { label: "Network", before: change.networkName },
      ];
      if (resource?.address) rows.unshift({ label: "Address", before: resource.address });
      return { ...base, rows };
    }
    case "update-resource": {
      const resource = live.networkResources?.find((r) => r.id === change.resourceId);
      const after = resourceFields(
        {
          name: change.name,
          address: change.address,
          enabled: change.enabled,
          groups: change.groupIds,
          description: change.description,
        },
        change.networkName,
        live,
      );
      const before = resource
        ? resourceFields(
            {
              name: resource.name,
              address: resource.address,
              enabled: resource.enabled,
              groups: (resource.groups ?? []).map((g) =>
                typeof g === "string" ? g : g.id ?? g.name,
              ),
              description: resource.description,
            },
            change.networkName,
            live,
          )
        : [];
      return { ...base, rows: diffFieldLists(before, after) };
    }

    case "create-router": {
      const target = change.peerId
        ? peerName(change.peerId, live)
        : groupName(change.groupId ?? EMPTY, live);
      return {
        ...base,
        rows: [
          { label: change.peerId ? "Routing peer" : "Peer group", after: target },
          { label: "Network", after: change.networkName },
          { label: "Metric", after: String(change.metric ?? 9999) },
          { label: "Masquerade", after: (change.masquerade ?? true) ? "Yes" : "No" },
          { label: "Enabled", after: (change.enabled ?? true) ? "Yes" : "No" },
        ],
      };
    }

    case "install-peer":
      return {
        ...base,
        rows: [{ label: "Name", after: change.name }],
        note:
          change.kind === "user-device"
            ? "Not an API change — select an existing peer or install a new one to complete this draft."
            : "Not an API change — install this peer with a setup key to complete this draft.",
      };
  }
}
