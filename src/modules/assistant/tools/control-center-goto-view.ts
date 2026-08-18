import { humanize, nonEmptyString, quoted, textOf } from "@utils/helpers";
import {
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";
import type { AgentNavigateInput } from "@/modules/control-center/agent/canvasAgentStore";

// `cc_navigate`: point the canvas at a view or a specific entity.
export const gotoView: ControlCenterToolAction = async (input, api, redactor) => {
  const step = await api.navigate({
    view: String(input.view ?? "") as AgentNavigateInput["view"],
    target: typeof input.target === "string" ? input.target : undefined,
  });
  return reportSteps([step], api, redactor);
};

export const describeGotoView: ControlCenterDescribeTrail = (input) => {
  const view = nonEmptyString(input.view);
  const target = textOf(input.target);
  return { detail: quoted(target ?? (view ? humanize(view) : undefined)) };
};
