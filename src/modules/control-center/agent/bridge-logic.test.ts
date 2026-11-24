import { describe, expect, it } from "vitest";
import type { Policy } from "@/interfaces/Policy";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  connectBlockedByDialog,
  connectOutcome,
  connectSide,
  consequencesText,
  describePolicySide,
  holdsLiveSetupKey,
  holdsSessionArtifacts,
  keyTargetZone,
  liveSetupKeyGuards,
  policyConsequences,
  policySidesKey,
  portsLabel,
  samePortRanges,
  strippedCanvasPolicies,
  swallowsKeyWhileBusy,
} from "./bridge-logic";

const policy = (rule: Partial<Policy["rules"][number]>, name = "Web"): Policy => ({
  id: "p1",
  name,
  description: "",
  enabled: true,
  source_posture_checks: [],
  rules: [
    {
      name,
      description: "",
      enabled: true,
      sources: [],
      destinations: [],
      bidirectional: true,
      action: "accept",
      protocol: "all",
      ports: [],
      ...rule,
    },
  ],
});

const change = (value: Record<string, unknown>) => value as unknown as DraftChange;

const evidence = (over: Partial<Parameters<typeof connectOutcome>[0]> = {}) => ({
  edges: new Set(["e1"]),
  state: "s",
  dialogs: 0,
  picker: false,
  ...over,
});

describe("connectOutcome", () => {
  it("reads an unchanged canvas as nothing connected", () => {
    expect(connectOutcome(evidence(), evidence())).toBe("nothing");
  });

  it("counts a new edge or a changed policy as connected", () => {
    expect(connectOutcome(evidence(), evidence({ edges: new Set(["e1", "e2"]) }))).toBe("connected");
    expect(connectOutcome(evidence(), evidence({ state: "s2" }))).toBe("connected");
  });

  it("reports a dialog only when one actually opened", () => {
    expect(connectOutcome(evidence(), evidence({ dialogs: 1 }))).toBe("dialog");
    expect(connectOutcome(evidence(), evidence({ picker: true }))).toBe("dialog");
    expect(connectOutcome(evidence({ dialogs: 1 }), evidence({ dialogs: 1 }))).toBe("nothing");
  });
});

describe("connectBlockedByDialog", () => {
  it("blocks a connect while a dialog or the picker is already open", () => {
    expect(connectBlockedByDialog(evidence())).toBe(false);
    expect(connectBlockedByDialog(evidence({ dialogs: 1 }))).toBe(true);
    expect(connectBlockedByDialog(evidence({ picker: true }))).toBe(true);
  });
});

describe("policy sides", () => {
  it("changes its key when a side gains a group or a resource", () => {
    const empty = policySidesKey(policy({}));
    expect(policySidesKey(policy({ sources: ["g1"] }))).not.toBe(empty);
    expect(policySidesKey(policy({ destinationResource: { id: "r1", type: "host" } }))).not.toBe(empty);
    expect(policySidesKey(policy({ protocol: "tcp", ports: ["443"] }))).toBe(empty);
  });

  it("resolves the side the way the connect handler does", () => {
    expect(connectSide(false, "sr-connect")).toBe("sources");
    expect(connectSide(false, "sl-connect")).toBe("destinations");
    expect(connectSide(true, "sr-connect")).toBe("destinations");
    expect(connectSide(true, "sl-connect")).toBe("sources");
  });

  it("names what an occupied side already holds", () => {
    const held = policy({ sources: [{ id: "g1", name: "Devs" }] });
    expect(describePolicySide(held, "sources")).toContain("“Devs”");
    expect(describePolicySide(policy({ destinationResource: { id: "r1", type: "host" } }), "destinations")).toContain(
      "a single resource",
    );
    expect(describePolicySide(policy({ sourceResource: { id: "p1", type: "peer" } }), "sources")).toContain(
      "a single peer",
    );
  });
});

describe("policyConsequences", () => {
  const sided = (sources: string[], destinations: string[], v = 1) => ({ v, rules: [{ sources, destinations }] });
  const update = change({ id: "c1", type: "update-policy", policyId: "p1", name: "Web", policy: sided(["a"], ["b"]) });
  const none = { updated: [], incomplete: [], incompleteDrafts: [], deleted: [], dropped: [], settled: [] };

  it("finds nothing when the policy writes are untouched", () => {
    const other = change({ id: "c2", type: "create-group", name: "Devs" });
    expect(policyConsequences([update], [update, other])).toEqual(none);
    expect(consequencesText(policyConsequences([update], [update, other]))).toBe("");
  });

  it("names a policy that a removal stripped", () => {
    const caused = policyConsequences([], [update]);
    expect(caused.updated).toEqual(["Web"]);
    expect(consequencesText(caused)).toContain("“Web” no longer includes it");
  });

  it("names a policy the strip left empty as deleted", () => {
    const deleted = change({ id: "c3", type: "delete-policy", policyId: "p1", name: "Web" });
    const caused = policyConsequences([update], [deleted]);
    expect(caused).toEqual({ ...none, deleted: ["Web"], settled: ["policy:p1"] });
    expect(consequencesText(caused)).toContain("DELETED on deploy");
  });

  it("sees a rewritten write and a draft policy that dropped out", () => {
    const rewritten = change({ id: "c1", type: "update-policy", policyId: "p1", name: "Web", policy: sided(["a"], ["b"], 2) });
    const create = change({ id: "c4", type: "create-policy", clientId: "new-1", name: "Draft", policy: sided(["a"], ["b"]) });
    expect(policyConsequences([update, create], [rewritten])).toEqual({
      ...none,
      updated: ["Web"],
      dropped: ["Draft"],
      settled: ["policy:p1", "policy:new-1"],
    });
  });

  it("covers agent policies under their own ids", () => {
    const agent = change({ id: "c5", type: "delete-agent-policy", agentPolicyId: "p1", name: "Agents" });
    expect(policyConsequences([update], [update, agent]).deleted).toEqual(["Agents"]);
  });

  it("finds canvas strips and never repeats a tracked policy", () => {
    const before = new Map([
      ["policy-1", { name: "Web", key: "a", existing: true, entity: "policy:1" }],
      ["policy-new-2", { name: "One-sided", key: "a", existing: false, entity: "policy:new-2" }],
      ["policy-3", { name: "Untouched", key: "a", existing: true, entity: "policy:3" }],
    ]);
    const after = new Map([
      ["policy-1", { name: "Web", key: "b", existing: true, entity: "policy:1" }],
      ["policy-new-2", { name: "One-sided", key: "b", existing: false, entity: "policy:new-2" }],
      ["policy-3", { name: "Untouched", key: "a", existing: true, entity: "policy:3" }],
      ["policy-4", { name: "Arrived", key: "a", existing: true, entity: "policy:4" }],
    ]);
    const canvas = strippedCanvasPolicies(before, after);
    expect(canvas.map((p) => p.id)).toEqual(["policy-1", "policy-new-2"]);
    const text = consequencesText({ ...none, updated: ["Web"], settled: ["policy:1"] }, canvas);
    expect(text.match(/“Web”/g)).toHaveLength(1);
    expect(text).toContain("“One-sided”");
  });

  it("never promises a revocation for a strip the changeset did not record", () => {
    const live = consequencesText(none, [{ name: "Web", existing: true, entity: "policy:1" }]);
    expect(live).not.toContain("on deploy");
    expect(live).toContain("no change was recorded");
    expect(live).toContain("NOT revoked");

    const drafted = consequencesText(none, [{ name: "Sketch", existing: false, entity: "policy:new-1" }]);
    expect(drafted).not.toContain("revoke");
    expect(drafted).toContain("not in the pending changes");

    const mixed = consequencesText({ ...none, updated: ["Api"], settled: ["policy:2"] }, [
      { name: "Web", existing: true, entity: "policy:1" },
    ]);
    expect(mixed).toContain("“Api” no longer includes it, which revokes that access on deploy");
    expect(mixed).toContain("“Web” is now incomplete on the canvas ONLY");
  });

  it("tells two policies of one name apart by id", () => {
    const text = consequencesText({ ...none, updated: ["Allow"], settled: ["policy:1"] }, [
      { name: "Allow", existing: true, entity: "policy:2" },
    ]);
    expect(text).toContain("“Allow” no longer includes it, which revokes that access on deploy");
    expect(text).toContain("“Allow” is now incomplete on the canvas ONLY");
    expect(text).toContain("NOT revoked");
  });

  it("never promises a revocation for a pending edit the strip left one-sided", () => {
    const stripped = change({ ...update, policy: sided([], ["b"]) });
    const caused = policyConsequences([update], [stripped]);
    expect(caused).toEqual({ ...none, incomplete: ["Web"], settled: ["policy:p1"] });
    const text = consequencesText(caused, [{ name: "Web", existing: true, entity: "policy:p1" }]);
    expect(text).not.toContain("on deploy");
    expect(text).toContain("Review will block the deploy until it is completed or discarded");
    expect(text).toContain("the live policy is unchanged until then");
    expect(text.match(/“Web”/g)).toHaveLength(1);
  });

  it("reports a draft policy a group deletion emptied as blocked, not as deploying", () => {
    const create = change({ id: "c4", type: "create-policy", clientId: "new-1", name: "Draft", policy: sided(["a"], ["b"]) });
    const emptied = change({ ...create, policy: sided(["a"], []) });
    const caused = policyConsequences([create], [emptied]);
    expect(caused.incompleteDrafts).toEqual(["Draft"]);
    expect(consequencesText(caused)).not.toContain("revokes");

    const agent = change({
      id: "c6",
      type: "create-agent-policy",
      clientId: "new-2",
      name: "Agents",
      policy: { sourceGroups: [], destinationProviderIds: ["pr1"] },
    });
    expect(policyConsequences([], [agent]).incompleteDrafts).toEqual(["Agents"]);
  });
});

describe("placeholder artifacts", () => {
  it("flags a placeholder or a holding group that carries a setup key", () => {
    expect(holdsLiveSetupKey({ placeholderKind: "server", setupKeyId: "k1" })).toBe(true);
    expect(holdsLiveSetupKey({ group: {}, draftPeers: [{ id: "draft-1", setupKeyId: "k1" }] })).toBe(true);
    expect(holdsLiveSetupKey({ placeholderKind: "server" })).toBe(false);
    expect(holdsLiveSetupKey({ placeholderKind: "server", boundGroupId: "g1" })).toBe(false);
    expect(holdsLiveSetupKey(undefined)).toBe(false);
  });

  it("guards every ancestor of a node that holds a key", () => {
    const nodes = [
      { id: "frame", data: { frame: true } },
      { id: "row", parentId: "frame", data: { group: {}, draftPeers: [{ id: "draft-1", setupKeyId: "k1" }] } },
      { id: "resource", parentId: "frame", data: {} },
      { id: "other-frame", data: {} },
      { id: "plain-row", parentId: "other-frame", data: { draftPeers: [{ id: "draft-2" }] } },
      { id: "placeholder", data: { placeholderKind: "server", setupKeyId: "k2" } },
    ];
    expect([...liveSetupKeyGuards(nodes)].sort()).toEqual(["frame", "placeholder", "row"]);
  });

  it("counts a bound group as a session artifact too", () => {
    expect(holdsSessionArtifacts({ placeholderKind: "server", boundGroupId: "g1" })).toBe(true);
    expect(holdsSessionArtifacts({ draftPeers: [{ boundGroupId: "g1" }] })).toBe(true);
    expect(holdsSessionArtifacts({ placeholderKind: "agent" })).toBe(false);
  });
});

describe("ports", () => {
  it("lists ports and ranges together", () => {
    expect(portsLabel(["443"], undefined)).toBe(" on 443");
    expect(portsLabel([], [{ start: 8000, end: 8100 }, { start: 22, end: 22 }])).toBe(" on 8000-8100, 22");
    expect(portsLabel([], undefined)).toBe(", all ports");
  });

  it("compares ranges by value", () => {
    expect(samePortRanges(undefined, [])).toBe(true);
    expect(samePortRanges([{ start: 1, end: 2 }], [{ start: 1, end: 2 }])).toBe(true);
    expect(samePortRanges([{ start: 1, end: 2 }], undefined)).toBe(false);
  });
});

describe("swallowsKeyWhileBusy", () => {
  it("kills undo, redo and delete wherever the canvas would hear them", () => {
    expect(swallowsKeyWhileBusy({ key: "z", metaKey: true }, "elsewhere")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "Z", ctrlKey: true }, "module")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "y", ctrlKey: true }, "elsewhere")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "Delete" }, "elsewhere")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "Backspace" }, "module")).toBe(true);
  });

  it("leaves dialogs and text fields alone", () => {
    expect(swallowsKeyWhileBusy({ key: "z", metaKey: true }, "exempt")).toBe(false);
    expect(swallowsKeyWhileBusy({ key: "Backspace" }, "exempt")).toBe(false);
  });

  it("exempts only text entry and dialogs, wherever they sit outside the module", () => {
    const at = (over: Partial<Parameters<typeof keyTargetZone>[0]>) =>
      keyTargetZone({ inModule: false, inDialog: false, textEntry: false, ...over });
    expect(at({ textEntry: true })).toBe("exempt");
    expect(at({ inDialog: true })).toBe("exempt");
    expect(at({})).toBe("elsewhere");
    expect(at({ inModule: true, textEntry: true })).toBe("module");
  });

  it("stops undo and delete from a button in the assistant panel, and nothing else", () => {
    const panelButton = keyTargetZone({ inModule: false, inDialog: false, textEntry: false });
    expect(swallowsKeyWhileBusy({ key: "z", metaKey: true }, panelButton)).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "Backspace" }, panelButton)).toBe(true);
    for (const key of ["Enter", " ", "Tab", "Escape", "ArrowDown"]) {
      expect(swallowsKeyWhileBusy({ key }, panelButton)).toBe(false);
    }
  });

  it("deadens a focused control inside the module but not the browser", () => {
    expect(swallowsKeyWhileBusy({ key: "Enter" }, "module")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: " " }, "module")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "Tab" }, "module")).toBe(false);
    expect(swallowsKeyWhileBusy({ key: "r", metaKey: true }, "module")).toBe(false);
    expect(swallowsKeyWhileBusy({ key: "Enter" }, "elsewhere")).toBe(false);
  });

  it("leaves the browser's own keys alone on a focused canvas node", () => {
    for (const key of ["F1", "F5", "F12", "Escape"]) {
      expect(swallowsKeyWhileBusy({ key }, "module")).toBe(false);
    }
    expect(swallowsKeyWhileBusy({ key: "ArrowLeft", altKey: true }, "module")).toBe(false);
    expect(swallowsKeyWhileBusy({ key: "Backspace", altKey: true }, "elsewhere")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "z", metaKey: true, altKey: true }, "module")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "f" }, "module")).toBe(true);
    expect(swallowsKeyWhileBusy({ key: "ArrowLeft" }, "module")).toBe(true);
  });
});
