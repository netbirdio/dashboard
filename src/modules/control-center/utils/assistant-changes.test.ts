import { describe, expect, it } from "vitest";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  changeEntityKey,
  markAssistantChanges,
  presentAssistantChanges,
} from "@/modules/control-center/utils/assistant-changes";

const group = (id: string, name = id) =>
  ({ id, type: "delete-group", groupId: `g-${id}`, name }) as DraftChange;
const key = (id: string) => `group:g-${id}`;
const updatePolicy = (id: string, policyId: string, ports: string[] = []) =>
  ({
    id,
    type: "update-policy",
    policyId,
    name: policyId,
    origin: "edit",
    policy: { id: policyId, name: policyId, rules: [{ ports }] },
  }) as unknown as DraftChange;

describe("markAssistantChanges", () => {
  it("marks the changes that appear while the assistant acts", () => {
    const mine = group("c1");
    const theirs = group("c2");
    const marked = markAssistantChanges([mine], [mine, theirs], new Set(), true);
    expect([...marked]).toEqual([key("c2")]);
  });

  it("marks a user's change the assistant replaces", () => {
    const mine = group("c1");
    const edited = { ...mine, name: "renamed" } as DraftChange;
    const marked = markAssistantChanges([mine], [edited], new Set(), true);
    expect([...marked]).toEqual([key("c1")]);
  });

  it("leaves the user's own changes unmarked", () => {
    const first = group("c1");
    const marked = markAssistantChanges([first], [first, group("c2")], new Set(), false);
    expect(marked.size).toBe(0);
  });

  it("keeps the mark when the user edits the assistant's change later", () => {
    const theirs = group("c1");
    const edited = { ...theirs, name: "renamed" } as DraftChange;
    const marked = markAssistantChanges([theirs], [edited], new Set([key("c1")]), false);
    expect([...presentAssistantChanges([edited], marked)]).toEqual(["c1"]);
  });

  it("keeps the mark when the user's edit re-records the entity under a new change id", () => {
    const theirs = updatePolicy("c1", "p1");
    const marked = markAssistantChanges([], [theirs], new Set(), true);
    const rerecorded = updatePolicy("c2", "p1", ["22"]);
    const after = markAssistantChanges([theirs], [rerecorded], marked, false);
    expect([...presentAssistantChanges([rerecorded], after)]).toEqual(["c2"]);
  });

  it("keeps the mark when an update turns into a delete of the same entity", () => {
    const marked = markAssistantChanges([], [updatePolicy("c1", "p1")], new Set(), true);
    const deletion = {
      id: "c9",
      type: "delete-policy",
      policyId: "p1",
      name: "p1",
    } as DraftChange;
    expect([...presentAssistantChanges([deletion], marked)]).toEqual(["c9"]);
  });

  it("does not mark a change the assistant's update rebuilt without altering", () => {
    const mine = updatePolicy("c1", "p1");
    const rebuilt = updatePolicy("c1", "p1");
    const theirs = group("c2");
    const marked = markAssistantChanges([mine], [rebuilt, theirs], new Set(), true);
    expect([...marked]).toEqual([key("c2")]);
  });

  it("keeps the mark across undo and redo, which restore the change while idle", () => {
    const theirs = group("c1");
    const undone = markAssistantChanges([theirs], [], new Set([key("c1")]), false);
    const redone = markAssistantChanges([], [theirs], undone, false);
    expect([...presentAssistantChanges([theirs], redone)]).toEqual(["c1"]);
  });

  it("reports only the marked changes still in the changeset", () => {
    const present = presentAssistantChanges(
      [group("c2")],
      new Set([key("c1"), key("c2")]),
    );
    expect([...present]).toEqual(["c2"]);
  });

  it("hands the mark to the change that replaces a marked one", () => {
    const readded = group("c2");
    const marked = markAssistantChanges(
      [group("c1")],
      [readded],
      new Set([key("c1")]),
      false,
      new Set(["c1"]),
    );
    expect([...presentAssistantChanges([readded], marked)]).toEqual(["c2"]);
  });

  it("does not mark the replacement of a user's own change", () => {
    const marked = markAssistantChanges(
      [group("c1")],
      [group("c2")],
      new Set(),
      false,
      new Set(["c1"]),
    );
    expect(marked.size).toBe(0);
  });

  it("returns the same set when nothing changed, so the provider doesn't re-render", () => {
    const change = group("c1");
    const before = new Set([key("c1")]);
    expect(markAssistantChanges([change], [change], before, true)).toBe(before);
  });
});

describe("changeEntityKey", () => {
  it("gives a draft entity and its later writes the same key", () => {
    const create = {
      id: "c1",
      type: "create-policy",
      clientId: "new-1",
      name: "P",
      policy: {},
    } as DraftChange;
    const remove = {
      id: "c2",
      type: "delete-policy",
      policyId: "new-1",
      name: "P",
    } as DraftChange;
    expect(changeEntityKey(create)).toBe(changeEntityKey(remove));
  });

  it("keeps an access policy and an agent policy with the same id apart", () => {
    const access = updatePolicy("c1", "p1");
    const agent = {
      id: "c2",
      type: "update-agent-policy",
      agentPolicyId: "p1",
      name: "P",
      policy: {},
    } as DraftChange;
    expect(changeEntityKey(access)).not.toBe(changeEntityKey(agent));
  });
});
