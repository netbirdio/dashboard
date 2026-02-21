export interface Account {
  id: string;
  domain: string;
  domain_category: string;
  created_at: string;
  created_by: string;
  settings: {
    extra: {
      peer_approval_enabled: boolean;
      user_approval_required: boolean;
      peer_expose_enabled?: boolean;
      peer_expose_groups?: string[];
    };
    peer_login_expiration_enabled: boolean;
    peer_login_expiration: number;
    peer_inactivity_expiration_enabled: boolean;
    peer_inactivity_expiration: number;
    groups_propagation_enabled: boolean;
    jwt_groups_enabled: boolean;
    jwt_groups_claim_name: string;
    jwt_allow_groups: string[];
    regular_users_view_blocked: boolean;
    routing_peer_dns_resolution_enabled: boolean;
    dns_domain: string;
    network_range?: string;
    lazy_connection_enabled: boolean;
    embedded_idp_enabled?: boolean;
    auto_update_version: string;
    local_auth_disabled?: boolean;
  };
  onboarding?: AccountOnboarding;
}

export interface AccountOnboarding {
  onboarding_flow_pending: boolean;
  signup_form_pending: boolean;
}
