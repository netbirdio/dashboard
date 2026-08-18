import { humanize, nonEmptyString, quoted } from "@utils/helpers";
import {
  type ControlCenterDescribeTrail,
  type ControlCenterToolAction,
  reportSteps,
} from "@/modules/assistant/tools/control-center-call-tool";
import type { AgentDraftAction } from "@/modules/control-center/agent/canvasAgentStore";

// Whole phrases: "Set up a draft 'Leave Draft'" said the opposite of what
// happened, so each action owns its verb.
const DRAFT_ACTION_LABELS: Record<string, string> = {
  new_empty: "Start an empty draft",
  from_current_view: "Start a draft from this view",
  exit: "Leave the draft",
};

// `cc_draft`: enter or leave the local draft the other tools edit.
export const createDraft: ControlCenterToolAction = async (
  input,
  api,
  redactor,
) => {
  const step = await api.draft(String(input.action ?? "") as AgentDraftAction);
  return reportSteps([step], api, redactor);
};

export const describeCreateDraft: ControlCenterDescribeTrail = (input) => {
  const action = nonEmptyString(input.action);
  // The verb says all of it; a subject would only repeat the verb.
  if (action && DRAFT_ACTION_LABELS[action])
    return { label: DRAFT_ACTION_LABELS[action] };
  return { detail: quoted(action ? humanize(action) : undefined) };
};
