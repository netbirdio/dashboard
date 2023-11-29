import {ExpiresInValue} from "../../views/ExpiresInInput";

export interface Account {
  id: string;
  settings: {
    peer_login_expiration_enabled: boolean;
    peer_login_expiration: number;
    jwt_groups_enabled: boolean;
    groups_propagation_enabled: boolean;
    jwt_groups_claim_name: string;
    extra: {
      peer_approval_enabled: boolean;
    }
  };
}

export interface FormAccount extends Account {
  peer_login_expiration_enabled: boolean;
  jwt_groups_enabled: boolean;
  groups_propagation_enabled: boolean;
  jwt_groups_claim_name: string;
  peer_login_expiration_formatted: ExpiresInValue;
  peer_approval_enabled: boolean;
}