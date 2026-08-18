import { humanize, nonEmptyString, quoted, textOf } from "@utils/helpers";
import {
  actions,
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";
import type { AgentAddItem } from "@/modules/control-center/agent/canvasAgentStore";

// `cc_add`: put a peer, group, resource or policy node on the draft.
export const addNode: ControlCenterToolAction = async (
  input,
  api,
  redactor,
) => {
  const items = actions<Record<string, unknown>>(input, "items");
  if (!items.some((i) => i.kind))
    return { content: "cc_add needs a `kind`.", isError: true };
  const steps = await api.add(
    items.map((i) => ({
      kind: String(i.kind ?? "") as AgentAddItem["kind"],
      ref: nonEmptyString(i.ref),
      role: nonEmptyString(i.role) as AgentAddItem["role"],
      bidirectional:
        typeof i.bidirectional === "boolean" ? i.bidirectional : undefined,
      name: nonEmptyString(i.name),
      description: nonEmptyString(i.description),
      address: nonEmptyString(i.address),
      network: nonEmptyString(i.network),
      members: Array.isArray(i.members)
        ? i.members.filter((m): m is string => typeof m === "string" && !!m)
        : undefined,
    })),
    input.final === true,
  );
  return reportSteps(steps, api, redactor);
};

export const describeAddNode: ControlCenterDescribeTrail = (input) => {
  // One item per call is the contract; a batched list is named by its first.
  const item = Array.isArray(input.items)
    ? ((input.items[0] ?? {}) as Record<string, unknown>)
    : input;
  const kind = nonEmptyString(item.kind);
  return {
    detail: quoted(
      textOf(item.name) ??
        textOf(item.ref) ??
        (kind ? humanize(kind) : undefined),
    ),
  };
};
