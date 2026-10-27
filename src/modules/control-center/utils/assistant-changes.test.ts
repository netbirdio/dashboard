import { describe, expect, it } from "vitest";
import type { DraftChange } from "@/modules/control-center/draft/DraftChangesetContext";
import { markAssistantChanges } from "@/modules/control-center/utils/assistant-changes";

const group = (id: string, name = id) =>
  ({ id, type: "delete-group", groupId: `g-${id}`, name }) as DraftChange;

describe("markAssistantChanges", () => {
  it("marks the changes that appear while the assistant acts", () => {
    const mine = group("c1");
    const theirs = group("c2");
    const marked = markAssistantChanges([mine], [mine, theirs], new Set(), true);
    expect([...marked]).toEqual(["c2"]);
  });

  it("marks a user's change the assistant replaces", () => {
    const mine = group("c1");
    const edited = { ...mine, name: "renamed" } as DraftChange;
    const marked = markAssistantChanges([mine], [edited], new Set(), true);
    expect([...marked]).toEqual(["c1"]);
  });

  it("leaves the user's own changes unmarked", () => {
    const first = group("c1");
    const marked = markAssistantChanges([first], [first, group("c2")], new Set(), false);
    expect(marked.size).toBe(0);
  });

  it("keeps the mark when the user edits the assistant's change later", () => {
    const theirs = group("c1");
    const edited = { ...theirs, name: "renamed" } as DraftChange;
    const marked = markAssistantChanges([theirs], [edited], new Set(["c1"]), false);
    expect([...marked]).toEqual(["c1"]);
  });

  it("drops the mark once the change leaves the changeset", () => {
    const marked = markAssistantChanges([group("c1")], [], new Set(["c1"]), false);
    expect(marked.size).toBe(0);
  });

  it("returns the same set when nothing changed, so the provider doesn't re-render", () => {
    const change = group("c1");
    const before = new Set(["c1"]);
    expect(markAssistantChanges([change], [change], before, true)).toBe(before);
  });
});
