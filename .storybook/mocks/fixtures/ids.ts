/**
 * Shared IDs so fixtures in different files can reference each other
 * (a policy pointing at a group, a route pointing at a peer) consistently.
 */
export const GROUP = {
  all: "grp-all",
  developers: "grp-developers",
  devops: "grp-devops",
  servers: "grp-servers",
  databases: "grp-databases",
  kubernetes: "grp-kubernetes",
  contractors: "grp-contractors",
  officeBerlin: "grp-office-berlin",
  officeNewYork: "grp-office-newyork",
  routingPeers: "grp-routing-peers",
  empty: "grp-empty",
} as const;

export const PEER = {
  macbook: "peer-macbook",
  windows: "peer-windows",
  linuxLaptop: "peer-linux-laptop",
  iphone: "peer-iphone",
  android: "peer-android",
  webServer: "peer-web-server",
  dbServer: "peer-db-server",
  k8sNode: "peer-k8s-node",
  routerBerlin: "peer-router-berlin",
  routerNewYork: "peer-router-newyork",
  offlineLaptop: "peer-offline-laptop",
  pendingApproval: "peer-pending-approval",
  loginExpired: "peer-login-expired",
} as const;

export const USER = {
  owner: "user-owner",
  admin: "user-admin",
  developer: "user-developer",
  auditor: "user-auditor",
  blocked: "user-blocked",
  pending: "user-pending",
  serviceCi: "user-service-ci",
  serviceMonitoring: "user-service-monitoring",
} as const;

export const NETWORK = {
  office: "net-office",
  aws: "net-aws",
  empty: "net-empty",
} as const;
export const POLICY = {
  allowAll: "pol-allow-all",
  devsToServers: "pol-devs-servers",
  dbAccess: "pol-db-access",
  disabled: "pol-disabled",
} as const;
export const POSTURE = {
  minVersion: "pc-min-version",
  geo: "pc-geo",
  os: "pc-os",
} as const;
