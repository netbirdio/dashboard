import { nonEmptyString } from "@utils/helpers";
import {
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";
import type { AgentCanvasAction } from "@/modules/control-center/agent/canvasAgentStore";

const CANVAS_ACTION_LABELS: Record<string, string> = {
  auto_arrange: "Arrange the canvas",
  fit_view: "Fit the view",
  zoom_in: "Zoom in",
  zoom_out: "Zoom out",
};

// `cc_canvas`: camera and layout — arrange, fit, zoom.
export const arrangeCanvas: ControlCenterToolAction = async (
  input,
  api,
  redactor,
) => {
  const step = await api.canvas(
    String(input.action ?? "") as AgentCanvasAction,
  );
  return reportSteps([step], api, redactor);
};

export const describeArrangeCanvas: ControlCenterDescribeTrail = (input) => {
  const action = nonEmptyString(input.action);
  return action && CANVAS_ACTION_LABELS[action]
    ? { label: CANVAS_ACTION_LABELS[action] }
    : {};
};
