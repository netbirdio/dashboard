import { quoted, textOf } from "@utils/helpers";
import {
  actions,
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";

// `cc_connect`: draw an access edge between two nodes on the draft.
export const connectNodes: ControlCenterToolAction = async (
  input,
  api,
  redactor,
) => {
  const links = actions<Record<string, unknown>>(input, "links");
  if (!links.some((l) => l.from && l.to))
    return { content: "cc_connect needs `from` and `to`.", isError: true };
  const steps = await api.connect(
    links.map((l) => ({
      from: String(l.from ?? ""),
      to: String(l.to ?? ""),
    })),
    input.final === true,
  );
  return reportSteps(steps, api, redactor);
};

export const describeConnectNodes: ControlCenterDescribeTrail = (input) => {
  const link = Array.isArray(input.links)
    ? ((input.links[0] ?? {}) as Record<string, unknown>)
    : input;
  const from = quoted(textOf(link.from));
  const to = quoted(textOf(link.to));
  return { detail: from && to ? `${from} to ${to}` : from ?? to };
};
