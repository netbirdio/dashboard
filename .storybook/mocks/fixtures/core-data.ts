import { GROUP, PEER, USER } from "./ids";
import { currentUser, ownerPermissions } from "./users";

/* Entities behind the core endpoints (peers, groups, users, setup keys…).
   Group membership is declared once on the peers and derived for the
   groups, so the counts on both pages always agree. */

const groupNames: Record<string, string> = {
  [GROUP.all]: "All",
  [GROUP.developers]: "Developers",
  [GROUP.devops]: "DevOps",
  [GROUP.servers]: "Servers",
  [GROUP.databases]: "Databases",
  [GROUP.kubernetes]: "Kubernetes Cluster Nodes (eu-central-1)",
  [GROUP.contractors]: "Contractors",
  [GROUP.officeBerlin]: "Office Berlin",
  [GROUP.officeNewYork]: "Office New York",
  [GROUP.routingPeers]: "Routing Peers",
  [GROUP.empty]: "Unused Group",
};

const groupIssued: Record<string, string> = {
  [GROUP.developers]: "jwt",
  [GROUP.contractors]: "integration",
};

/* Network resources (owned by the network fixtures) that belong to a group. */
const groupResources: Record<string, { id: string; type: string }[]> = {
  [GROUP.databases]: [
    { id: "res-postgres", type: "host" },
    { id: "res-office-lan", type: "subnet" },
  ],
  [GROUP.servers]: [{ id: "res-internal-domain", type: "domain" }],
};

const DAY = "2026-10-08";

type PeerSeed = {
  id: string;
  name: string;
  ip: string;
  os: string;
  kernel?: string;
  version: string;
  ui?: string;
  connected: boolean;
  lastSeen: string;
  user?: string;
  groups: string[];
  city: string;
  country: string;
  connectionIp: string;
  serial?: string;
  ssh?: boolean;
  expiration?: boolean;
  inactivity?: boolean;
  approval?: boolean;
  expired?: boolean;
  ephemeral?: boolean;
  ipv6?: string;
  extraLabels?: string[];
  created: string;
  macs?: string[];
};

const seeds: PeerSeed[] = [
  {
    id: PEER.macbook,
    name: "olivias-macbook-pro",
    ip: "100.92.14.21",
    ipv6: "fd00:4e42::5c0e:15",
    os: "macOS 15.1",
    kernel: "24.1.0",
    version: "0.60.0",
    ui: "netbird-desktop-ui/0.60.0",
    connected: true,
    lastSeen: `${DAY}T11:58:00Z`,
    user: USER.owner,
    groups: [GROUP.all, GROUP.developers, GROUP.devops, GROUP.officeBerlin],
    city: "Berlin",
    country: "DE",
    connectionIp: "84.191.20.11",
    serial: "C02F1234Q6L4",
    expiration: true,
    created: "2025-02-03T08:12:00Z",
    macs: ["a4:83:e7:12:9c:01"],
  },
  {
    id: PEER.windows,
    name: "DESKTOP-ADMIN-01",
    ip: "100.92.31.4",
    os: "Microsoft Windows 11 Pro",
    kernel: "10.0.26100",
    version: "0.58.1",
    ui: "netbird-desktop-ui/0.58.1",
    connected: true,
    lastSeen: `${DAY}T11:50:00Z`,
    user: USER.admin,
    groups: [GROUP.all, GROUP.developers, GROUP.officeBerlin],
    city: "Munich",
    country: "DE",
    connectionIp: "93.104.7.200",
    serial: "PF3XK9LM",
    expiration: true,
    created: "2025-03-11T14:00:00Z",
    macs: ["00:1a:2b:3c:4d:5e"],
  },
  {
    id: PEER.linuxLaptop,
    name: "dev-thinkpad",
    ip: "100.92.87.103",
    os: "Ubuntu 24.04.1 LTS",
    kernel: "6.8.0-45-generic",
    version: "0.60.0",
    ui: "netbird-desktop-ui/0.60.0",
    connected: true,
    lastSeen: `${DAY}T11:59:30Z`,
    user: USER.developer,
    groups: [GROUP.all, GROUP.developers, GROUP.devops],
    city: "Amsterdam",
    country: "NL",
    connectionIp: "145.53.12.7",
    serial: "PC1X9ZQ2",
    expiration: true,
    inactivity: true,
    created: "2025-05-20T09:30:00Z",
  },
  {
    id: PEER.iphone,
    name: "Olivia's iPhone",
    ip: "100.92.200.8",
    os: "iOS 18.0.1",
    version: "0.60.0",
    connected: true,
    lastSeen: `${DAY}T10:15:00Z`,
    user: USER.owner,
    groups: [GROUP.all, GROUP.officeNewYork],
    city: "New York",
    country: "US",
    connectionIp: "72.229.28.185",
    expiration: true,
    created: "2025-06-01T17:45:00Z",
  },
  {
    id: PEER.android,
    name: "pixel-9-pro",
    ip: "100.92.143.66",
    os: "Android 15",
    version: "0.59.2",
    connected: false,
    lastSeen: "2026-10-06T19:20:00Z",
    user: USER.developer,
    groups: [GROUP.all, GROUP.contractors],
    city: "London",
    country: "GB",
    connectionIp: "81.2.69.160",
    expiration: true,
    created: "2025-07-14T12:00:00Z",
  },
  {
    id: PEER.webServer,
    name: "web-server-01",
    ip: "100.92.10.10",
    os: "Debian GNU/Linux 12 (bookworm)",
    kernel: "6.1.0-25-amd64",
    version: "0.60.0",
    connected: true,
    lastSeen: `${DAY}T11:59:50Z`,
    user: USER.serviceCi,
    groups: [GROUP.all, GROUP.servers],
    city: "Frankfurt am Main",
    country: "DE",
    connectionIp: "3.120.45.10",
    ssh: true,
    created: "2025-01-20T10:00:00Z",
    extraLabels: ["www", "api"],
    macs: ["02:42:ac:11:00:02", "02:42:ac:11:00:03"],
  },
  {
    id: PEER.dbServer,
    name: "db-primary",
    ip: "100.92.10.20",
    os: "Rocky Linux 9.4 (Blue Onyx)",
    kernel: "5.14.0-427.el9.x86_64",
    version: "0.57.0",
    connected: true,
    lastSeen: `${DAY}T11:59:40Z`,
    groups: [GROUP.all, GROUP.servers, GROUP.databases],
    city: "Frankfurt am Main",
    country: "DE",
    connectionIp: "3.120.45.11",
    ssh: true,
    created: "2025-01-20T10:05:00Z",
  },
  {
    id: PEER.k8sNode,
    name: "k8s-node-eu-central-1a",
    ip: "100.92.12.5",
    os: "Alpine Linux 3.20",
    kernel: "6.6.31-0-virt",
    version: "0.60.0",
    connected: true,
    lastSeen: `${DAY}T11:59:55Z`,
    user: USER.serviceCi,
    groups: [GROUP.all, GROUP.servers, GROUP.kubernetes, GROUP.devops],
    city: "Frankfurt am Main",
    country: "DE",
    connectionIp: "3.120.45.30",
    created: "2025-08-02T06:00:00Z",
  },
  {
    id: PEER.routerBerlin,
    name: "router-berlin",
    ip: "100.92.1.1",
    os: "FreeBSD 14.1-RELEASE",
    kernel: "14.1-RELEASE",
    version: "0.59.2",
    connected: true,
    lastSeen: `${DAY}T11:59:59Z`,
    groups: [GROUP.all, GROUP.routingPeers, GROUP.officeBerlin],
    city: "Berlin",
    country: "DE",
    connectionIp: "84.191.20.1",
    ssh: true,
    created: "2025-01-16T11:00:00Z",
  },
  {
    id: PEER.routerNewYork,
    name: "router-newyork",
    ip: "100.92.1.2",
    os: "Ubuntu 22.04.4 LTS",
    kernel: "5.15.0-119-generic",
    version: "0.60.0",
    connected: false,
    lastSeen: "2026-10-07T23:10:00Z",
    groups: [GROUP.all, GROUP.routingPeers, GROUP.officeNewYork],
    city: "New York",
    country: "US",
    connectionIp: "72.229.28.1",
    created: "2025-01-16T11:30:00Z",
  },
  {
    id: PEER.offlineLaptop,
    name: "auditor-workstation-with-a-very-long-hostname-that-truncates",
    ip: "100.92.55.17",
    os: "Fedora Linux 40 (Workstation Edition)",
    kernel: "6.10.6-200.fc40.x86_64",
    version: "0.52.0",
    ui: "netbird-desktop-ui/0.52.0",
    connected: false,
    lastSeen: "2026-08-21T08:00:00Z",
    user: USER.auditor,
    groups: [GROUP.all, GROUP.developers],
    city: "Paris",
    country: "FR",
    connectionIp: "90.84.12.201",
    expiration: true,
    created: "2025-04-09T13:00:00Z",
  },
  {
    id: PEER.pendingApproval,
    name: "contractor-laptop",
    ip: "100.92.77.2",
    os: "Microsoft Windows 10 Enterprise",
    kernel: "10.0.19045",
    version: "0.60.0",
    ui: "netbird-desktop-ui/0.60.0",
    connected: false,
    lastSeen: `${DAY}T09:00:00Z`,
    user: USER.pending,
    groups: [GROUP.all, GROUP.contractors],
    city: "Tokyo",
    country: "JP",
    connectionIp: "126.12.4.99",
    expiration: true,
    approval: true,
    created: `${DAY}T08:55:00Z`,
  },
  {
    id: PEER.loginExpired,
    name: "admin-macbook-air",
    ip: "100.92.60.30",
    os: "macOS 14.6.1",
    kernel: "23.6.0",
    version: "0.59.2",
    ui: "netbird-desktop-ui/0.59.2",
    connected: false,
    lastSeen: "2026-10-03T16:45:00Z",
    user: USER.admin,
    groups: [GROUP.all, GROUP.developers],
    city: "Zurich",
    country: "CH",
    connectionIp: "178.197.10.2",
    expiration: true,
    expired: true,
    created: "2025-09-01T10:00:00Z",
  },
  {
    id: "peer-browser-client",
    name: "netbird-browser-7f3a",
    ip: "100.92.99.1",
    os: "js",
    kernel: "wasm",
    version: "0.60.0",
    connected: true,
    lastSeen: `${DAY}T11:58:30Z`,
    user: USER.owner,
    groups: [GROUP.all],
    city: "Berlin",
    country: "DE",
    connectionIp: "84.191.20.11",
    ephemeral: true,
    created: `${DAY}T11:40:00Z`,
  },
];

const ref = (id: string) => ({
  id,
  name: groupNames[id],
  peers_count: 0,
  resources_count: 0,
  issued: groupIssued[id] ?? "api",
});

export const peers = seeds.map((s) => ({
  id: s.id,
  name: s.name,
  ip: s.ip,
  ipv6: s.ipv6,
  connected: s.connected,
  created_at: s.created,
  last_seen: s.lastSeen,
  os: s.os,
  kernel_version: s.kernel ?? "",
  version: s.version,
  ui_version: s.ui ?? "",
  groups: s.groups.map(ref),
  ssh_enabled: !!s.ssh,
  hostname: s.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  user_id: s.user ?? "",
  dns_label: `${s.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")}.netbird.cloud`,
  extra_dns_labels: (s.extraLabels ?? []).map((l) => `${l}.netbird.cloud`),
  last_login: s.lastSeen,
  login_expired: !!s.expired,
  login_expiration_enabled: !!s.expiration,
  inactivity_expiration_enabled: !!s.inactivity,
  approval_required: !!s.approval,
  city_name: s.city,
  country_code: s.country,
  connection_ip: s.connectionIp,
  serial_number: s.serial ?? "",
  ephemeral: !!s.ephemeral,
  accessible_peers_count: 6,
  network_addresses: (s.macs ?? []).map((mac, i) => ({
    net_ip: `192.168.1.${10 + i}/24`,
    mac,
  })),
  local_flags: {
    block_inbound: false,
    block_lan_access: false,
    disable_client_routes: false,
    disable_dns: false,
    disable_firewall: false,
    disable_server_routes: false,
    lazy_connection_enabled: s.id === PEER.linuxLaptop,
    rosenpass_enabled: s.id === PEER.webServer,
    rosenpass_permissive: false,
    server_ssh_allowed: !!s.ssh,
  },
}));

export const groups = Object.values(GROUP).map((id) => {
  const members = peers.filter((p) => p.groups.some((g) => g.id === id));
  const resources = groupResources[id] ?? [];
  return {
    id,
    name: groupNames[id],
    issued: groupIssued[id] ?? "api",
    peers_count: members.length,
    peers: members.map((p) => ({ id: p.id, name: p.name })),
    resources_count: resources.length,
    resources,
  };
});

const member = { ...ownerPermissions, is_restricted: true };
const rolePermissions = (role: string) =>
  role === "owner" || role === "admin" ? ownerPermissions : member;

type UserSeed = {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  groups?: string[];
  lastLogin?: string;
  service?: boolean;
  blocked?: boolean;
  pending?: boolean;
};

const userSeeds: UserSeed[] = [
  {
    id: USER.admin,
    name: "Adam Admin",
    email: "adam@netbird.io",
    role: "admin",
    groups: [GROUP.developers, GROUP.devops],
    lastLogin: "2026-10-08T07:02:00Z",
  },
  {
    id: USER.developer,
    name: "Dana Developer",
    email: "dana.developer@netbird.io",
    role: "user",
    groups: [
      GROUP.developers,
      GROUP.devops,
      GROUP.officeBerlin,
      GROUP.kubernetes,
    ],
    lastLogin: "2026-10-07T15:20:00Z",
  },
  {
    id: USER.auditor,
    name: "Audrey Auditor",
    email: "audrey@external-audit.example",
    role: "auditor",
    groups: [GROUP.developers],
    lastLogin: "2026-08-21T07:55:00Z",
  },
  {
    id: USER.blocked,
    name: "Bob Blocked",
    email: "bob@netbird.io",
    role: "user",
    status: "blocked",
    blocked: true,
    groups: [GROUP.contractors],
    lastLogin: "2026-05-02T12:00:00Z",
  },
  {
    id: USER.pending,
    name: "Paula Pending",
    email: "paula.contractor@agency.example",
    role: "user",
    pending: true,
    groups: [GROUP.contractors],
  },
  {
    id: "user-invited",
    name: "Ivan Invited",
    email: "ivan@netbird.io",
    role: "network_admin",
    status: "invited",
    groups: [GROUP.officeNewYork],
  },
  {
    id: "user-billing",
    name: "Bianca Billing",
    email: "billing@netbird.io",
    role: "billing_admin",
    lastLogin: "2026-09-30T10:00:00Z",
  },
  {
    id: USER.serviceCi,
    name: "CI/CD Pipeline",
    email: "",
    role: "admin",
    service: true,
    groups: [],
    lastLogin: "2026-10-08T11:00:00Z",
  },
  {
    id: USER.serviceMonitoring,
    name: "Monitoring",
    email: "",
    role: "user",
    service: true,
  },
];

export const users = [
  currentUser,
  ...userSeeds.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status ?? "active",
    auto_groups: u.groups ?? [],
    is_current: false,
    is_service_user: !!u.service,
    is_blocked: !!u.blocked,
    pending_approval: !!u.pending,
    last_login: u.lastLogin ?? "0001-01-01T00:00:00Z",
    issued: "api",
    permissions: rolePermissions(u.role),
  })),
];

export const setupKeys = [
  {
    id: "sk-servers",
    name: "Server provisioning",
    key: "A1B2C****",
    type: "reusable",
    state: "valid",
    valid: true,
    revoked: false,
    used_times: 14,
    usage_limit: 0,
    expires: "2027-01-01T00:00:00Z",
    last_used: "2026-10-07T22:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    auto_groups: [GROUP.servers, GROUP.devops],
    ephemeral: false,
    allow_extra_dns_labels: true,
    expires_in: 0,
  },
  {
    id: "sk-k8s",
    name: "Kubernetes nodes (ephemeral)",
    key: "K8SND****",
    type: "reusable",
    state: "valid",
    valid: true,
    revoked: false,
    used_times: 128,
    usage_limit: 500,
    expires: "2026-12-31T00:00:00Z",
    last_used: "2026-10-08T11:30:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    auto_groups: [
      GROUP.kubernetes,
      GROUP.servers,
      GROUP.devops,
      GROUP.routingPeers,
    ],
    ephemeral: true,
    allow_extra_dns_labels: false,
    expires_in: 0,
  },
  {
    id: "sk-oneoff",
    name: "Router Berlin",
    key: "ROUTE****",
    type: "one-off",
    state: "overused",
    valid: false,
    revoked: false,
    used_times: 1,
    usage_limit: 1,
    expires: "2026-11-15T00:00:00Z",
    last_used: "2025-01-16T11:00:00Z",
    updated_at: "2025-01-16T11:00:00Z",
    auto_groups: [GROUP.routingPeers],
    ephemeral: false,
    allow_extra_dns_labels: false,
    expires_in: 0,
  },
  {
    id: "sk-expired",
    name: "Contractor onboarding Q2",
    key: "CNTRC****",
    type: "reusable",
    state: "expired",
    valid: false,
    revoked: false,
    used_times: 3,
    usage_limit: 10,
    expires: "2026-06-30T00:00:00Z",
    last_used: "2026-06-12T09:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    auto_groups: [GROUP.contractors],
    ephemeral: false,
    allow_extra_dns_labels: false,
    expires_in: 0,
  },
  {
    id: "sk-revoked",
    name: "Leaked test key",
    key: "LEAKD****",
    type: "reusable",
    state: "revoked",
    valid: false,
    revoked: true,
    used_times: 0,
    usage_limit: 0,
    expires: "2027-03-01T00:00:00Z",
    last_used: "0001-01-01T00:00:00Z",
    updated_at: "2026-09-12T00:00:00Z",
    auto_groups: [],
    ephemeral: false,
    allow_extra_dns_labels: false,
    expires_in: 0,
  },
];

export const invites = [
  {
    id: "inv-1",
    email: "new.hire@netbird.io",
    name: "Nora New-Hire",
    role: "user",
    auto_groups: [GROUP.developers],
    created_at: "2026-10-06T09:00:00Z",
    expires_at: "2026-10-13T09:00:00Z",
    expired: false,
  },
  {
    id: "inv-2",
    email: "old.invite@agency.example",
    name: "Oscar Old",
    role: "admin",
    auto_groups: [GROUP.contractors, GROUP.officeBerlin],
    created_at: "2026-09-01T09:00:00Z",
    expires_at: "2026-09-08T09:00:00Z",
    expired: true,
  },
];

export const tokens = [
  {
    id: "tok-terraform",
    name: "Terraform",
    created_by: USER.owner,
    created_at: "2026-03-01T10:00:00Z",
    expiration_date: "2027-03-01T10:00:00Z",
    last_used: "2026-10-08T06:00:00Z",
  },
  {
    id: "tok-script",
    name: "Backup script",
    created_by: USER.owner,
    created_at: "2026-07-10T10:00:00Z",
    expiration_date: "2026-10-10T10:00:00Z",
    last_used: "0001-01-01T00:00:00Z",
  },
  {
    id: "tok-expired",
    name: "Old CLI token",
    created_by: USER.owner,
    created_at: "2025-10-01T10:00:00Z",
    expiration_date: "2026-04-01T10:00:00Z",
    last_used: "2026-03-20T10:00:00Z",
  },
];

export const jobs = [
  {
    id: "job-1",
    triggered_by: USER.owner,
    status: "succeeded",
    created_at: "2026-10-08T10:00:00Z",
    completed_at: "2026-10-08T10:02:00Z",
    failed_reason: null,
    workload: {
      type: "bundle",
      result: { upload_key: "4f2c9a1e/netbird.debug.zip" },
      parameters: {
        anonymize: true,
        bundle_for: true,
        bundle_for_time: 2,
        log_file_count: 10,
      },
    },
  },
  {
    id: "job-2",
    triggered_by: USER.admin,
    status: "pending",
    created_at: "2026-10-08T11:55:00Z",
    completed_at: null,
    failed_reason: null,
    workload: {
      type: "bundle",
      result: null,
      parameters: {
        anonymize: false,
        bundle_for: false,
        bundle_for_time: 0,
        log_file_count: 5,
      },
    },
  },
  {
    id: "job-3",
    triggered_by: USER.owner,
    status: "failed",
    created_at: "2026-10-05T08:00:00Z",
    completed_at: "2026-10-05T08:00:30Z",
    failed_reason: "peer is offline",
    workload: {
      type: "bundle",
      result: null,
      parameters: {
        anonymize: true,
        bundle_for: false,
        bundle_for_time: 0,
        log_file_count: 10,
      },
    },
  },
];

const actor = (id: string) => users.find((u) => u.id === id)!;
const event = (
  id: number,
  timestamp: string,
  activity: string,
  activity_code: string,
  initiator: string,
  target_id: string,
  meta: Record<string, string>,
) => ({
  id: String(id),
  timestamp,
  activity,
  activity_code,
  initiator_id: initiator,
  initiator_email: actor(initiator)?.email ?? "",
  initiator_name: actor(initiator)?.name ?? "",
  target_id,
  meta,
});

export const auditEvents = [
  event(
    1,
    "2026-10-08T11:40:00Z",
    "Peer added",
    "user.peer.add",
    USER.owner,
    PEER.macbook,
    {
      name: "olivias-macbook-pro",
      fqdn: "olivias-macbook-pro.netbird.cloud",
      ip: "100.92.14.21",
      created_at: "2026-10-08T11:40:00Z",
      location_city_name: "Berlin",
      location_country_code: "DE",
      location_connection_ip: "84.191.20.11",
    },
  ),
  event(
    2,
    "2026-10-08T10:12:00Z",
    "Policy updated",
    "policy.update",
    USER.admin,
    "pol-devs-servers",
    { name: "Developers to Servers" },
  ),
  event(
    3,
    "2026-10-08T09:30:00Z",
    "Group added to user",
    "user.group.add",
    USER.owner,
    USER.developer,
    {
      group: "DevOps",
      group_id: GROUP.devops,
      username: "Dana Developer",
      email: "dana.developer@netbird.io",
    },
  ),
  event(
    4,
    "2026-10-08T09:00:00Z",
    "Peer login expired",
    "peer.login.expire",
    USER.admin,
    PEER.loginExpired,
    {
      name: "admin-macbook-air",
      fqdn: "admin-macbook-air.netbird.cloud",
      ip: "100.92.60.30",
    },
  ),
  event(
    5,
    "2026-10-07T18:20:00Z",
    "User blocked",
    "user.block",
    USER.owner,
    USER.blocked,
    { username: "Bob Blocked", email: "bob@netbird.io" },
  ),
  event(
    6,
    "2026-10-07T16:00:00Z",
    "Setup key created",
    "setupkey.add",
    USER.owner,
    "sk-k8s",
    {
      name: "Kubernetes nodes (ephemeral)",
      type: "reusable",
      key: "K8SND****",
    },
  ),
  event(
    7,
    "2026-10-07T12:00:00Z",
    "Route deleted",
    "route.delete",
    USER.admin,
    "route-legacy",
    {
      name: "Legacy VPC",
      network_range: "10.20.0.0/16",
      peer_ip: "100.92.1.1",
    },
  ),
  event(
    8,
    "2026-10-06T08:00:00Z",
    "Group renamed",
    "group.update",
    USER.owner,
    GROUP.officeNewYork,
    { old_name: "NYC Office", new_name: "Office New York" },
  ),
  event(
    9,
    "2026-10-05T14:30:00Z",
    "Personal access token created",
    "personal.access.token.create",
    USER.owner,
    "tok-terraform",
    { name: "Terraform", username: "Olivia Owner" },
  ),
  event(
    10,
    "2026-10-04T09:15:00Z",
    "Peer SSH server enabled",
    "peer.ssh.enable",
    USER.serviceCi,
    PEER.webServer,
    {
      name: "web-server-01",
      fqdn: "web-server-01.netbird.cloud",
      ip: "100.92.10.10",
    },
  ),
  event(
    11,
    "2026-10-03T07:00:00Z",
    "Dashboard login",
    "dashboard.login",
    USER.developer,
    USER.developer,
    {},
  ),
  event(
    12,
    "2026-10-02T11:00:00Z",
    "Account network range updated",
    "account.network.range.update",
    USER.owner,
    "acc-storybook",
    { old_network_range: "100.64.0.0/10", new_network_range: "100.92.0.0/16" },
  ),
];

const machine = (peerId: string) => {
  const p = peers.find((x) => x.id === peerId)!;
  return {
    id: p.id,
    name: p.name,
    os: p.os,
    type: "PEER",
    address: `${p.ip}:51820`,
    dns_label: p.dns_label,
    geo_location: { city_name: p.city_name, country_code: p.country_code },
  };
};

const flow = (
  i: number,
  src: string,
  dst: ReturnType<typeof machine>,
  protocol: number,
  type: string,
  minute: number,
  bytes: number,
  extra: Record<string, unknown> = {},
) => {
  const s = machine(src);
  const owner = users.find(
    (u) => u.id === peers.find((p) => p.id === src)?.user_id,
  );
  const ts = `2026-10-08T${String(11 - Math.floor(minute / 60)).padStart(
    2,
    "0",
  )}:${String(59 - (minute % 60)).padStart(2, "0")}:00Z`;
  return {
    id: `flow-${i}`,
    flow_id: `flow-${i}`,
    reporter_id: src,
    source: s,
    destination: dst,
    user: owner
      ? { id: owner.id, email: owner.email, name: owner.name }
      : { id: "", email: "", name: "" },
    policy: { id: "pol-devs-servers", name: "Developers to Servers" },
    icmp: { type: 0, code: 0 },
    protocol,
    direction: "EGRESS",
    rx_bytes: bytes,
    rx_packets: Math.round(bytes / 900),
    tx_bytes: Math.round(bytes / 3),
    tx_packets: Math.round(bytes / 2700),
    events: [{ type, timestamp: ts }],
    ...extra,
  };
};

const resource = (id: string, name: string, address: string, type: string) => ({
  id,
  name,
  os: "",
  type,
  address,
  dns_label: "",
  geo_location: { city_name: "", country_code: "" },
});

export const trafficEvents = [
  flow(1, PEER.macbook, machine(PEER.webServer), 6, "TYPE_START", 1, 482_000),
  flow(
    2,
    PEER.linuxLaptop,
    machine(PEER.dbServer),
    6,
    "TYPE_END",
    3,
    12_400_000,
    {
      events: [
        { type: "TYPE_START", timestamp: "2026-10-08T11:41:00Z" },
        { type: "TYPE_END", timestamp: "2026-10-08T11:56:00Z" },
      ],
    },
  ),
  flow(
    3,
    PEER.windows,
    resource(
      "res-postgres",
      "postgres.internal",
      "10.0.1.20:5432",
      "HOST_RESOURCE",
    ),
    6,
    "TYPE_DROP",
    5,
    0,
  ),
  flow(
    4,
    PEER.iphone,
    resource(
      "res-office-lan",
      "Office LAN",
      "192.168.10.15:443",
      "SUBNET_RESOURCE",
    ),
    17,
    "TYPE_START",
    9,
    2_048,
  ),
  flow(5, PEER.k8sNode, machine(PEER.routerBerlin), 1, "TYPE_START", 14, 640, {
    icmp: { type: 8, code: 0 },
  }),
  flow(
    6,
    PEER.macbook,
    resource(
      "res-internal-domain",
      "*.internal.example.com",
      "app.internal.example.com:443",
      "DOMAIN_RESOURCE",
    ),
    6,
    "TYPE_END",
    20,
    88_000_000,
  ),
  flow(7, PEER.linuxLaptop, machine(PEER.k8sNode), 6, "TYPE_START", 33, 9_800, {
    num_of_starts: 12,
    num_of_ends: 11,
    num_of_drops: 2,
    window_start: "2026-10-08T11:00:00Z",
    window_end: "2026-10-08T11:30:00Z",
  }),
  flow(8, PEER.android, machine(PEER.webServer), 6, "TYPE_DROP", 61, 0),
];

export const countries = [
  { country_code: "CH", country_name: "Switzerland" },
  { country_code: "DE", country_name: "Germany" },
  { country_code: "FR", country_name: "France" },
  { country_code: "GB", country_name: "United Kingdom" },
  { country_code: "JP", country_name: "Japan" },
  { country_code: "NL", country_name: "Netherlands" },
  { country_code: "US", country_name: "United States" },
];

export const cities = [
  { city_name: "Berlin", geoname_id: 2950159 },
  { city_name: "Frankfurt am Main", geoname_id: 2925533 },
  { city_name: "Munich", geoname_id: 2867714 },
];

export const identityProviders = [
  {
    id: "idp-google",
    type: "google",
    name: "Google Workspace",
    issuer: "https://accounts.google.com",
    client_id: "1234567890-abc.apps.googleusercontent.com",
    redirect_url: "https://api.storybook.test/oauth2/callback",
  },
  {
    id: "idp-okta",
    type: "okta",
    name: "Okta (Contractors)",
    issuer: "https://agency.okta.com",
    client_id: "0oa1b2c3d4e5f6g7h8",
    redirect_url: "https://api.storybook.test/oauth2/callback",
  },
];
