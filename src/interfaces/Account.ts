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
      network_traffic_logs_enabled?: boolean;
      network_traffic_logs_groups?: string[];
      network_traffic_packet_counter_enabled?: boolean;
      network_traffic_exit_node_collection_enabled?: boolean;
      network_traffic_dns_collection_enabled?: boolean;
      flow_enabled?: boolean;
      flow_groups?: string[];
      flow_packet_counter_enabled?: boolean;
      flow_exit_node_collection_enabled?: boolean;
      flow_dns_collection_enabled?: boolean;
      flow_local_storage_enabled?: boolean;
      flow_local_storage_path?: string;
      flow_local_storage_max_size_mb?: number;
      flow_local_storage_max_files?: number;
      flow_syslog_enabled?: boolean;
      flow_syslog_server?: string;
      flow_syslog_protocol?: string;
      flow_syslog_facility?: string;
      flow_syslog_tag?: string;
    };
    flow?: {
      enabled?: boolean;
      groups?: string[];
      counters?: boolean;
      dns_collection?: boolean;
      exit_node_collection?: boolean;
    };
    flow_logs?: {
      enabled?: boolean;
      groups?: string[];
      counters?: boolean;
      dns_collection?: boolean;
      exit_node_collection?: boolean;
    };
    peer_login_expiration_enabled: boolean;
    peer_expose_enabled?: boolean;
    peer_expose_groups?: string[];
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
    auto_update_always: boolean;
    local_auth_disabled?: boolean;
    login_method?: "all" | "email" | "wechatwork";
  };
  onboarding?: AccountOnboarding;
}

export interface AccountOnboarding {
  onboarding_flow_pending: boolean;
  signup_form_pending: boolean;
}
