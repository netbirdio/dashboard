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
  };
}

export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}
