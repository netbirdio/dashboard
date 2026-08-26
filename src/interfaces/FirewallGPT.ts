export interface FirewallGPTRequest {
  prompt: string;
}

export interface FirewallGPTResponse {
  request_id: string;
  clarifying_questions: string[];
  prompt_result: PromptResult[];
}

export interface PromptResult {
  body: any;
  execution_index: number;
  operation: OperationType;
  used_as: string;
}

export interface FirewallGPTConfirmation {
  request_id: string;
  confirmation: "yes" | "no";
}

export enum OperationType {
  CREATE_POLICY = "create_policy",
  CREATE_GROUP = "create_group",
  CREATE_POSTURE_CHECK = "create_posture_check",
  USE_POSTURE_CHECK = "use_posture_check",
}

export interface RegistrationStatus {
  status: "approved" | "pending" | "missing";
  account_id: string;
}
