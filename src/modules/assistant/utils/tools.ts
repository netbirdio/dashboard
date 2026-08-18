// Every tool the assistant can call. Wire names must match the server's registry.
import {
  addNode,
  describeAddNode,
} from "@/modules/assistant/tools/control-center-add-node";
import {
  arrangeCanvas,
  describeArrangeCanvas,
} from "@/modules/assistant/tools/control-center-arrange-canvas";
import type {
  ControlCenterDescribeTrail,
  ControlCenterToolAction,
} from "@/modules/assistant/tools/control-center-call-tool";
import {
  connectNodes,
  describeConnectNodes,
} from "@/modules/assistant/tools/control-center-connect-nodes";
import {
  createDraft,
  describeCreateDraft,
} from "@/modules/assistant/tools/control-center-create-draft";
import {
  describeEditNode,
  editNode,
} from "@/modules/assistant/tools/control-center-edit-node";
import {
  describeEditPolicy,
  editPolicy,
} from "@/modules/assistant/tools/control-center-edit-policy";
import { getCanvasSnapshot } from "@/modules/assistant/tools/control-center-get-canvas-snapshot";
import {
  describeGotoView,
  gotoView,
} from "@/modules/assistant/tools/control-center-goto-view";
import {
  getAccountSettings,
  getCurrentUser,
  getEvents,
  getGroups,
  getNameserverGroups,
  getPeer,
  getPeers,
  getPolicies,
  getRoutes,
  getSetupKeys,
  getUsers,
} from "@/modules/assistant/tools/get-from-api";
import type { RedactionConfig } from "@/modules/assistant/utils/redaction";

// Activity-trail label: `[running, done]`, or one phrase for both tenses.
export type ToolLabels = string | [running: string, done: string];

// A read-only GET against the management API; `select` narrows the raw payload.
// `redact` is the whitelist the result goes through before it can leave the
// browser — absent means the result is sent as-is, so only omit it for
// payloads that carry no account data.
export interface ManagementApiCall {
  path: (input: Record<string, unknown>) => string;
  redact?: RedactionConfig;
  select?: (raw: unknown) => unknown;
}

export interface ManagementTool {
  kind: "management";
  labels: ToolLabels;
  action: ManagementApiCall;
}

export interface NavigationTool {
  kind: "navigation";
  labels: ToolLabels;
}

export interface ControlCenterTool {
  kind: "control-center";
  labels: ToolLabels;
  action: ControlCenterToolAction;
  describe?: ControlCenterDescribeTrail;
}

// Executed by the assistant server; listed here for its labels only.
export interface ServerTool {
  kind: "server";
  labels: ToolLabels;
}

export type AssistantTool =
  | ManagementTool
  | NavigationTool
  | ControlCenterTool
  | ServerTool;

export const ASSISTANT_TOOLS: Record<string, AssistantTool> = {
  list_peers: {
    kind: "management",
    labels: ["Reading peers", "Read peers"],
    action: getPeers,
  },
  get_peer: {
    kind: "management",
    labels: ["Reading peer details", "Read peer details"],
    action: getPeer,
  },
  list_groups: {
    kind: "management",
    labels: ["Reading groups", "Read groups"],
    action: getGroups,
  },
  list_policies: {
    kind: "management",
    labels: ["Reading access policies", "Read access policies"],
    action: getPolicies,
  },
  list_routes: {
    kind: "management",
    labels: ["Reading networks & routes", "Read networks & routes"],
    action: getRoutes,
  },
  list_nameserver_groups: {
    kind: "management",
    labels: ["Reading DNS configuration", "Read DNS configuration"],
    action: getNameserverGroups,
  },
  list_setup_keys: {
    kind: "management",
    labels: ["Reading setup keys", "Read setup keys"],
    action: getSetupKeys,
  },
  list_users: {
    kind: "management",
    labels: ["Reading users", "Read users"],
    action: getUsers,
  },
  get_current_user: {
    kind: "management",
    labels: ["Reading your profile", "Read your profile"],
    action: getCurrentUser,
  },
  get_account_settings: {
    kind: "management",
    labels: ["Reading account settings", "Read account settings"],
    action: getAccountSettings,
  },
  list_events: {
    kind: "management",
    labels: ["Reading activity events", "Read activity events"],
    action: getEvents,
  },

  open_page: {
    kind: "navigation",
    labels: ["Navigating to", "Navigated to"],
  },

  // Canvas labels are one imperative phrase, so the trail reads as moves.
  cc_state: {
    kind: "control-center",
    labels: "Read the canvas",
    action: getCanvasSnapshot,
  },
  cc_navigate: {
    kind: "control-center",
    labels: "Open the control center",
    action: gotoView,
    describe: describeGotoView,
  },
  cc_draft: {
    kind: "control-center",
    labels: "Set up a draft",
    action: createDraft,
    describe: describeCreateDraft,
  },
  cc_add: {
    kind: "control-center",
    labels: "Add to draft",
    action: addNode,
    describe: describeAddNode,
  },
  cc_connect: {
    kind: "control-center",
    labels: "Connect",
    action: connectNodes,
    describe: describeConnectNodes,
  },
  cc_node: {
    kind: "control-center",
    labels: "Edit the draft",
    action: editNode,
    describe: describeEditNode,
  },
  cc_policy: {
    kind: "control-center",
    labels: "Edit policy",
    action: editPolicy,
    describe: describeEditPolicy,
  },
  cc_canvas: {
    kind: "control-center",
    labels: "Arrange the canvas",
    action: arrangeCanvas,
    describe: describeArrangeCanvas,
  },

  search_docs: {
    kind: "server",
    labels: ["Searching the docs", "Searched the docs"],
  },
  fetch_doc: {
    kind: "server",
    labels: ["Reading documentation", "Read documentation"],
  },
  get_api_reference: {
    kind: "server",
    labels: ["Looking up the API reference", "Looked up the API reference"],
  },
  render_component: {
    kind: "server",
    labels: ["Preparing a view", "Prepared a view"],
  },
  ask_user: {
    kind: "server",
    labels: ["Asking a question", "Asked a question"],
  },
};
