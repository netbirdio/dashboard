import { describe, expect, it } from "vitest";
import { controlCenterActivity } from "./controlCenterTools";

/** Stands in for the redactor: `{NODE_1}` is displayed as the node's label. */
const restore = (text: string) =>
  ({ "{NODE_1}": "Minecraft Players", "{NODE_2}": "Minecraft Access", "{NODE_3}": "Group (2)" })[
    text
  ] ?? text;

describe("controlCenterActivity", () => {
  it("lets the draft action own the whole phrase", () => {
    // It used to read "Set up a draft 'new_empty'" — and, worse, "Set up a
    // draft 'Leave Draft'", which says the opposite of what happened.
    expect(controlCenterActivity("cc_draft", { action: "new_empty" }, restore)).toEqual({
      label: "Start an empty draft",
    });
    expect(controlCenterActivity("cc_draft", { action: "exit" }, restore)).toEqual({
      label: "Leave the draft",
    });
    expect(
      controlCenterActivity("cc_draft", { action: "from_current_view" }, restore),
    ).toEqual({ label: "Start a draft from this view" });

    // An action we don't have a phrase for still reads as words, not an enum.
    expect(controlCenterActivity("cc_draft", { action: "some_future_mode" }, restore)).toEqual({
      label: "Set up a draft",
      detail: "'Some Future Mode'",
    });
  });

  it("names what was added, preferring the name over the kind", () => {
    expect(
      controlCenterActivity("cc_add", { kind: "server", name: "Minecraft Server" }, restore),
    ).toEqual({ label: "Add to draft", detail: "'Minecraft Server'" });

    // Unnamed placeholder — the kind, humanised.
    expect(controlCenterActivity("cc_add", { kind: "user_device" }, restore)).toEqual({
      label: "Add to draft",
      detail: "'User Device'",
    });
  });

  it("shows both ends of a connection", () => {
    expect(
      controlCenterActivity("cc_connect", { from: "{NODE_1}", to: "{NODE_2}" }, restore),
    ).toEqual({ label: "Connect", detail: "'Minecraft Players' to 'Minecraft Access'" });
  });

  it("takes its verb from the node action", () => {
    expect(
      controlCenterActivity(
        "cc_node",
        { node: "{NODE_3}", action: "rename", name: "Players" },
        restore,
      ),
    ).toEqual({ label: "Rename", detail: "'Group (2)' to 'Players'" });

    expect(
      controlCenterActivity("cc_node", { node: "{NODE_3}", action: "remove" }, restore),
    ).toEqual({ label: "Remove", detail: "'Group (2)'" });

    // A move's coordinates aren't a "to" worth printing.
    expect(
      controlCenterActivity(
        "cc_node",
        { node: "{NODE_3}", action: "move", position: { x: 0, y: 0 } },
        restore,
      ),
    ).toEqual({ label: "Move", detail: "'Group (2)'" });
  });

  it("names the policy it edits, and the camera move it makes", () => {
    expect(controlCenterActivity("cc_policy", { node: "{NODE_2}" }, restore)).toEqual({
      label: "Edit policy",
      detail: "'Minecraft Access'",
    });
    expect(controlCenterActivity("cc_canvas", { action: "fit_view" }, restore)).toEqual({
      label: "Fit the view",
    });
  });

  it("reads the first entry of a batched list", () => {
    expect(
      controlCenterActivity("cc_add", { items: [{ kind: "agent", name: "Runner" }] }, restore),
    ).toEqual({ label: "Add to draft", detail: "'Runner'" });
  });
});
