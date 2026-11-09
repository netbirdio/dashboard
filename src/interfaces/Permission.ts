export interface Permissions {
  is_restricted: boolean;
  modules: {
    peers: Permission;
    groups: Permission;

    setup_keys: Permission;

    policies: Permission;
    assistant: Permission;

    networks: Permission;
    routes: Permission;
    nameservers: Permission;
    dns: Permission;

    users: Permission;
    pats: Permission;

    events: Permission;

    settings: Permission;
    accounts: Permission;
    billing: Permission;
    identity_providers: Permission;

    edr: Permission;
    event_streaming: Permission;
    idp: Permission;

    msp: Permission;
    tenants: Permission;

    proxy: Permission;
    proxy_configuration: Permission;

    services: Permission;

    agent_network: Permission;
    "agent_network.providers": Permission;
    "agent_network.policies": Permission;
    "agent_network.guardrails": Permission;
    "agent_network.budgets": Permission;
    "agent_network.usage": Permission;
    "agent_network.logs": Permission;
    "agent_network.settings": Permission;
  };
}

export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}
