import { nonEmptyString, quoted, textOf } from "@utils/helpers";
import {
  actions,
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";
import type { AgentNodeAction } from "@/modules/control-center/agent/canvasAgentStore";

// Per-action verbs — "Rename" says far more than "Edit the draft".
const NODE_ACTION_LABELS: Record<string, string> = {
  rename: "Rename",
  remove: "Remove",
  delete: "Delete",
  enable: "Enable",
  disable: "Disable",
  focus: "Focus",
  unfocus: "Clear focus",
  move: "Move",
  add_to_group: "Add to group",
  route_network: "Set routing peer",
  details: "Open details",
};

// `cc_node`: act on one node of the draft (rename, move, group, …).
export const editNode: ControlCenterToolAction = async (
  input,
  api,
  redactor,
) => {
  const list = actions<Record<string, unknown>>(input, "actions");
  if (!list.some((a) => a.node && a.action))
    return { content: "cc_node needs `node` and `action`.", isError: true };
  const steps = await api.node(
    list.map((a) => ({
      node: String(a.node ?? ""),
      action: String(a.action ?? "") as AgentNodeAction["action"],
      name: nonEmptyString(a.name),
      group: nonEmptyString(a.group),
      network: nonEmptyString(a.network),
      position:
        a.position && typeof a.position === "object"
          ? {
              x: Number((a.position as { x?: unknown }).x ?? 0),
              y: Number((a.position as { y?: unknown }).y ?? 0),
            }
          : undefined,
    })),
    input.final === true,
  );
  return reportSteps(steps, api, redactor);
};

export const describeEditNode: ControlCenterDescribeTrail = (input) => {
  const action = Array.isArray(input.actions)
    ? ((input.actions[0] ?? {}) as Record<string, unknown>)
    : input;
  const verb = nonEmptyString(action.action);
  const subject = quoted(textOf(action.node));
  // Rename, add_to_group and route_network have a second half worth showing
  // ("Set routing peer 'Office Router' to 'Office'").
  const target = quoted(
    textOf(action.name) ?? textOf(action.group) ?? textOf(action.network),
  );
  return {
    ...(verb && NODE_ACTION_LABELS[verb]
      ? { label: NODE_ACTION_LABELS[verb] }
      : {}),
    detail:
      subject && target && verb !== "move"
        ? `${subject} to ${target}`
        : subject,
  };
};
