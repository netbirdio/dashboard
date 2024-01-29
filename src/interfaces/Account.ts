export interface Account {
  id: string;
  settings: {
    extra: {
      peer_approval_enabled: boolean;
    };
    peer_login_expiration_enabled: boolean;
    peer_login_expiration: number;
    groups_propagation_enabled: boolean;
    jwt_groups_enabled: boolean;
    jwt_groups_claim_name: string;
    jwt_allow_groups: string[];
  };
}
