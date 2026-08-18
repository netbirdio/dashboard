import {
  type ControlCenterToolAction,
  redactSnapshot,
} from "@/modules/assistant/tools/control-center-call-tool";

// `cc_state`: the canvas snapshot, tokenised, for the model to reason over.
export const getCanvasSnapshot: ControlCenterToolAction = async (
  _input,
  api,
  redactor,
) => ({
  content: JSON.stringify(redactSnapshot(api.snapshot(), redactor)),
  isError: false,
});
