import { nonEmptyString, quoted, textOf } from "@utils/helpers";
import {
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";
import type { AgentPolicyEdit } from "@/modules/control-center/agent/canvasAgentStore";

// `cc_policy`: edit a policy node's rule (protocol, ports, direction).
export const editPolicy: ControlCenterToolAction = async (
  input,
  api,
  redactor,
) => {
  if (typeof input.node !== "string")
    return { content: "cc_policy needs the policy's `node`.", isError: true };
  const step = await api.policy(
    {
      node: input.node,
      name: nonEmptyString(input.name),
      description: nonEmptyString(input.description),
      enabled: typeof input.enabled === "boolean" ? input.enabled : undefined,
      protocol: nonEmptyString(input.protocol) as AgentPolicyEdit["protocol"],
      ports: Array.isArray(input.ports) ? input.ports.map(String) : undefined,
      bidirectional:
        typeof input.bidirectional === "boolean"
          ? input.bidirectional
          : undefined,
    },
    input.final === true,
  );
  return reportSteps([step], api, redactor);
};

export const describeEditPolicy: ControlCenterDescribeTrail = (input) => ({
  detail: quoted(textOf(input.node)),
});
