import { useApiCall } from "@utils/api";

export type PlaygroundPrincipalKind = "peer" | "group";

export type PlaygroundHeader = {
  name: string;
  values: string[];
};

export type PlaygroundRequest = {
  principal: {
    kind: PlaygroundPrincipalKind;
    id: string;
  };
  method: "GET" | "POST";
  path: string;
  headers: PlaygroundHeader[];
  body: string;
};

export type PlaygroundResponse = {
  status_code: number;
  headers: PlaygroundHeader[];
  body: string;
  body_encoding: "utf8" | "base64";
  body_truncated: boolean;
  identity: {
    user_id: string;
    user_email: string;
    group_ids: string[];
    group_names: string[];
  };
  policy: {
    decision: string;
    reason: string;
    provider_surface: string;
    model: string;
    resolved_provider_id: string;
    authorising_group_ids: string[];
    selected_policy_id: string;
    attribution_group_id: string;
  };
};

export function usePlaygroundApi() {
  return useApiCall<PlaygroundResponse>("/agent-network/playground", true);
}
