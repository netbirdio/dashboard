export interface ActivityEvent {
  id: string;
  timestamp: string;
  activity: string;
  activity_code: string;
  initiator_id: string;
  initiator_email: string;
  initiator_name: string;
  target_id: string;
  meta: { [key: string]: string };
}

export const ActivityGroupNames = {
  user: "User",
  account: "Account",
  setupkey: "Setup-Key",
  rule: "Rule",
  policy: "Policy",
  peer: "Peer",
  group: "Group",
  route: "Route",
  dns: "DNS",
  nameserver: "Nameserver",
  service: "Service",
  integration: "Integration",
  dashboard: "Dashboard",
};

export const ActivityEventCodes = {
  User: {
    "user.peer.add": "Peer added",
    "user.join": "User joined",
    "user.invite": "User invited",
    "user.peer.delete": "Peer deleted",
    "user.group.add": "Group added to user",
    "user.group.delete": "Group removed from user",
    "user.role.update": "User role updated",
    "personal.access.token.create": "Personal access token created",
    "personal.access.token.delete": "Personal access token deleted",
    "user.block": "User blocked",
    "user.unblock": "User unblocked",
    "user.delete": "User deleted",
    "user.peer.login": "User logged in peer",
  },
  Account: {
    "account.create": "Account created",
    "account.setting.peer.login.expiration.update":
      "Account peer login expiration duration updated",
    "account.setting.peer.login.expiration.enable":
      "Account peer login expiration enabled",
    "account.setting.peer.login.expiration.disable":
      "Account peer login expiration disabled",
  },
  "Setup-Key": {
    "setupkey.peer.add": "Peer added with setup key",
    "setupkey.add": "Setup key created",
    "setupkey.update": "Setup key updated",
    "setupkey.revoke": "Setup key revoked",
    "setupkey.overuse": "Setup key overused",
    "setupkey.group.add": "Group added to setup key",
    "setupkey.group.delete": "Group removed from user setup key",
  },
  Rule: {
    "rule.add": "Rule added",
    "rule.update": "Rule updated",
    "rule.delete": "Rule deleted",
  },
  Policy: {
    "policy.add": "Policy added",
    "policy.update": "Policy updated",
    "policy.delete": "Policy deleted",
  },
  Peer: {
    "peer.group.add": "Group added to peer",
    "peer.group.delete": "Group removed from peer",
    "peer.ssh.enable": "Peer SSH server enabled",
    "peer.ssh.disable": "Peer SSH server disabled",
    "peer.rename": "Peer renamed",
    "peer.login.expiration.enable": "Peer login expiration enabled",
    "peer.login.expiration.disable": "Peer login expiration disabled",
    "peer.login.expire": "Peer login expired",
  },
  Group: {
    "group.add": "Group created",
    "group.update": "Group updated",
    "group.delete": "Group deleted",
  },
  Route: {
    "route.add": "Route created",
    "route.delete": "Route deleted",
    "route.update": "Route updated",
  },
  DNS: {
    "dns.setting.disabled.management.group.add":
      "Group added to disabled management DNS setting",
    "dns.setting.disabled.management.group.delete":
      "Group removed from disabled management DNS setting",
  },
  Nameserver: {
    "nameserver.group.add": "Nameserver group created",
    "nameserver.group.delete": "Nameserver group deleted",
    "nameserver.group.update": "Nameserver group updated",
  },
  Service: {
    "service.user.create": "Service user created",
    "service.user.delete": "Service user deleted",
  },
  Integration: {
    "integration.create": "Integration created",
    "integration.update": "Integration updated",
    "integration.delete": "Integration deleted",
  },
  Dashboard: {
    "dashboard.login": "Dashboard login",
  },
};
