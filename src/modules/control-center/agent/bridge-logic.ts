import type { Group } from "@/interfaces/Group";
import type { Policy, PolicyRule, PortRange } from "@/interfaces/Policy";
import {
  type DraftChange,
  getChangeIssue,
} from "@/modules/control-center/draft/DraftChangesetContext";

type Side = "sources" | "destinations";

const groupKey = (entry: Group | string): string =>
  typeof entry === "string" ? entry : entry.id ?? entry.name;

const groupLabel = (entry: Group | string): string =>
  typeof entry === "string" ? entry : entry.name ?? entry.id ?? "a group";

const sideGroups = (rule: PolicyRule | undefined, side: Side) =>
  ((rule?.[side] as (Group | string)[] | null) ?? []).filter(Boolean);

export function policySidesKey(policy: Policy | undefined): string {
  const rule = policy?.rules?.[0];
  return JSON.stringify([
    sideGroups(rule, "sources").map(groupKey),
    sideGroups(rule, "destinations").map(groupKey),
    rule?.sourceResource?.id ?? null,
    rule?.destinationResource?.id ?? null,
  ]);
}

export function connectSide(
  policyIsSource: boolean,
  sourceHandle: string,
): Side {
  if (policyIsSource) {
    return sourceHandle.startsWith("sl") ? "sources" : "destinations";
  }
  return sourceHandle.startsWith("sl") ? "destinations" : "sources";
}

export function describePolicySide(
  policy: Policy | undefined,
  side: Side,
): string {
  const rule = policy?.rules?.[0];
  const word = side === "sources" ? "source" : "destination";
  const single =
    side === "sources" ? rule?.sourceResource : rule?.destinationResource;
  if (single) {
    const what = single.type === "peer" ? "a single peer" : "a single resource";
    return `its ${word} side already holds ${what}, and a side takes either groups or one peer/resource, never both`;
  }
  const groups = sideGroups(rule, side);
  if (groups.length > 0) {
    const names = groups.map((g) => `“${groupLabel(g)}”`).join(", ");
    return `its ${word} side already holds ${
      groups.length === 1 ? "the group" : "the groups"
    } ${names}; a group that is already there is not added twice, and a single peer or resource only fits an empty side`;
  }
  return `its ${word} side is empty, but that node can't sit there (a resource or network is a destination only)`;
}

export type PolicyConsequences = {
  updated: string[];
  incomplete: string[];
  incompleteDrafts: string[];
  deleted: string[];
  dropped: string[];
  settled: string[];
};

export const policyEntityKey = (kind: "policy" | "agent", id: string) =>
  `${kind}:${id}`;

const policyEntity = (change: DraftChange): string | undefined => {
  switch (change.type) {
    case "create-policy":
      return policyEntityKey("policy", change.clientId);
    case "update-policy":
    case "delete-policy":
      return policyEntityKey("policy", change.policyId);
    case "create-agent-policy":
      return policyEntityKey("agent", change.clientId);
    case "update-agent-policy":
    case "delete-agent-policy":
      return policyEntityKey("agent", change.agentPolicyId);
    default:
      return undefined;
  }
};

const nameOf = (change: DraftChange): string =>
  "name" in change && change.name ? change.name : "Policy";

const isDeletion = (change: DraftChange) =>
  change.type === "delete-policy" || change.type === "delete-agent-policy";

const isCreation = (change: DraftChange) =>
  change.type === "create-policy" || change.type === "create-agent-policy";

export function policyConsequences(
  before: readonly DraftChange[],
  after: readonly DraftChange[],
): PolicyConsequences {
  const earlier = new Map<string, string>();
  before.forEach((change) => {
    const key = policyEntity(change);
    if (key) earlier.set(key, JSON.stringify(change));
  });

  const result: PolicyConsequences = {
    updated: [],
    incomplete: [],
    incompleteDrafts: [],
    deleted: [],
    dropped: [],
    settled: [],
  };
  const pending = [...after];
  const bucket = (change: DraftChange) => {
    if (isDeletion(change)) return result.deleted;
    if (getChangeIssue(change, pending)?.label !== "Incomplete") {
      return result.updated;
    }
    return isCreation(change) ? result.incompleteDrafts : result.incomplete;
  };
  const seen = new Set<string>();
  after.forEach((change) => {
    const key = policyEntity(change);
    if (!key) return;
    seen.add(key);
    if (earlier.get(key) === JSON.stringify(change)) return;
    bucket(change).push(nameOf(change));
    result.settled.push(key);
  });
  before.forEach((change) => {
    const key = policyEntity(change);
    if (key && !seen.has(key) && !isDeletion(change)) {
      result.dropped.push(nameOf(change));
      result.settled.push(key);
    }
  });
  return result;
}

export type CanvasPolicy = {
  name: string;
  key: string;
  existing: boolean;
  entity: string;
};

export type CanvasStrip = {
  id: string;
  name: string;
  existing: boolean;
  entity: string;
};

export function strippedCanvasPolicies(
  before: ReadonlyMap<string, CanvasPolicy>,
  after: ReadonlyMap<string, CanvasPolicy>,
): CanvasStrip[] {
  const strips: CanvasStrip[] = [];
  after.forEach((now, id) => {
    const was = before.get(id);
    if (was && was.key !== now.key) {
      strips.push({
        id,
        name: now.name,
        existing: now.existing,
        entity: now.entity,
      });
    }
  });
  return strips;
}

const nameList = (names: string[]) =>
  [...new Set(names)].map((n) => `“${n}”`).join(", ");

const one = (names: string[]) => new Set(names).size === 1;

export function consequencesText(
  consequences: PolicyConsequences,
  canvasOnly: readonly Omit<CanvasStrip, "id">[] = [],
): string {
  const settled = new Set(consequences.settled);
  const unrecorded = canvasOnly.filter((p) => !settled.has(p.entity));
  const live = unrecorded.filter((p) => p.existing).map((p) => p.name);
  const drafted = unrecorded.filter((p) => !p.existing).map((p) => p.name);

  const parts: string[] = [];
  if (consequences.updated.length > 0) {
    parts.push(
      `${nameList(consequences.updated)} no longer ${
        one(consequences.updated) ? "includes" : "include"
      } it, which revokes that access on deploy`,
    );
  }
  const { incomplete, incompleteDrafts } = consequences;
  if (incomplete.length > 0) {
    parts.push(
      `${nameList(incomplete)} no longer ${
        one(incomplete) ? "includes" : "include"
      } it, which leaves ${
        one(incomplete) ? "its pending change" : "their pending changes"
      } incomplete: Review will block the deploy until ${
        one(incomplete) ? "it is" : "they are"
      } completed or discarded, and the live ${
        one(incomplete) ? "policy is" : "policies are"
      } unchanged until then, so that access is NOT revoked yet`,
    );
  }
  if (incompleteDrafts.length > 0) {
    parts.push(
      `${nameList(incompleteDrafts)} (draft) no longer ${
        one(incompleteDrafts) ? "includes" : "include"
      } it and ${
        one(incompleteDrafts) ? "is" : "are"
      } now incomplete: Review will block the deploy until ${
        one(incompleteDrafts) ? "it is" : "they are"
      } given a source and a destination or discarded`,
    );
  }
  if (consequences.deleted.length > 0) {
    parts.push(
      `${nameList(
        consequences.deleted,
      )} would authorize nothing without it and will be DELETED on deploy`,
    );
  }
  if (consequences.dropped.length > 0) {
    parts.push(
      `${nameList(
        consequences.dropped,
      )} lost a side and dropped out of the pending changes until completed again`,
    );
  }
  if (live.length > 0) {
    parts.push(
      `${nameList(live)} ${
        one(live) ? "is" : "are"
      } now incomplete on the canvas ONLY — no change was recorded, nothing will deploy for ${
        one(live) ? "it" : "them"
      }, and the live ${
        one(live) ? "policy is" : "policies are"
      } unchanged, so that access is NOT revoked. To revoke it, give the policy another source or destination, or delete the policy`,
    );
  }
  if (drafted.length > 0) {
    parts.push(
      `${nameList(drafted)} (draft, not in the pending changes) no longer ${
        one(drafted) ? "includes" : "include"
      } it and still ${
        one(drafted) ? "needs" : "need"
      } a source and a destination before ${
        one(drafted) ? "it" : "they"
      } can deploy`,
    );
  }
  return parts.length > 0 ? `Policies affected: ${parts.join("; ")}.` : "";
}

type ArtifactHolder = {
  placeholderKind?: string;
  setupKeyId?: string;
  boundGroupId?: string;
  draftPeers?: { setupKeyId?: string; boundGroupId?: string }[];
};

export function holdsLiveSetupKey(data: unknown): boolean {
  const holder = (data ?? {}) as ArtifactHolder;
  if (holder.placeholderKind && holder.setupKeyId) return true;
  return !!holder.draftPeers?.some((p) => !!p?.setupKeyId);
}

type TreeNode = { id: string; parentId?: string; data?: unknown };

export function liveSetupKeyGuards(nodes: readonly TreeNode[]): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const guarded = new Set<string>();
  nodes.forEach((holder) => {
    if (!holdsLiveSetupKey(holder.data)) return;
    let node: TreeNode | undefined = holder;
    while (node && !guarded.has(node.id)) {
      guarded.add(node.id);
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
  });
  return guarded;
}

export function holdsSessionArtifacts(data: unknown): boolean {
  const holder = (data ?? {}) as ArtifactHolder;
  if (holder.placeholderKind && (holder.setupKeyId || holder.boundGroupId)) {
    return true;
  }
  return !!holder.draftPeers?.some((p) => !!(p?.setupKeyId || p?.boundGroupId));
}

export type ConnectEvidence = {
  edges: Set<string>;
  state: string;
  dialogs: number;
  picker: boolean;
};

export type ConnectOutcome = "connected" | "dialog" | "nothing";

export function connectOutcome(
  before: ConnectEvidence,
  after: ConnectEvidence,
): ConnectOutcome {
  const newEdge = [...after.edges].some((id) => !before.edges.has(id));
  if (newEdge || after.state !== before.state) return "connected";
  if (after.dialogs > before.dialogs || (after.picker && !before.picker)) {
    return "dialog";
  }
  return "nothing";
}

export const connectBlockedByDialog = (before: ConnectEvidence): boolean =>
  before.dialogs > 0 || before.picker;

export function portsLabel(
  ports: readonly string[] | undefined,
  ranges: readonly PortRange[] | undefined,
): string {
  const all = [
    ...(ports ?? []),
    ...(ranges ?? []).map((r) =>
      r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`,
    ),
  ];
  return all.length > 0 ? ` on ${all.join(", ")}` : ", all ports";
}

export const samePortRanges = (
  a: readonly PortRange[] | undefined,
  b: readonly PortRange[] | undefined,
): boolean =>
  (a ?? []).map((r) => `${r.start}-${r.end}`).join(",") ===
  (b ?? []).map((r) => `${r.start}-${r.end}`).join(",");

export type KeyTargetZone = "module" | "exempt" | "elsewhere";

type KeyTarget = {
  inModule: boolean;
  inDialog: boolean;
  textEntry: boolean;
};

export function keyTargetZone(target: KeyTarget): KeyTargetZone {
  if (target.inModule) return "module";
  return target.inDialog || target.textEntry ? "exempt" : "elsewhere";
}

type KeyLike = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
};

const BROWSER_KEY = /^(f\d{1,2}|escape)$/;

export function swallowsKeyWhileBusy(e: KeyLike, zone: KeyTargetZone): boolean {
  if (zone === "exempt") return false;
  const key = e.key.toLowerCase();
  const command = !!(e.metaKey || e.ctrlKey);
  const undoRedo = command && (key === "z" || key === "y");
  if (undoRedo) return true;
  if (command) return false;
  if (key === "delete" || key === "backspace") return true;
  if (e.altKey || BROWSER_KEY.test(key)) return false;
  return zone === "module" && key !== "tab";
}
