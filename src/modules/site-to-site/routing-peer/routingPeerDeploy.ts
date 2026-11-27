import { Group, GroupPeer } from "@/interfaces/Group";

export type InstallMethod = "linux" | "docker" | "compose";

export const SETUP_KEY_PLACEHOLDER = "<SETUP_KEY>";

export const ROUTING_PEERS_DOCS_LINK =
  "https://docs.netbird.io/manage/networks#routing-peers";

export const INSTALL_METHODS: Record<
  InstallMethod,
  { label: string; title: string; description: string }
> = {
  linux: {
    label: "Linux",
    title: "Install on Linux",
    description: "Run on a Linux machine in the network to install NetBird.",
  },
  docker: {
    label: "Docker",
    title: "Run with Docker",
    description: "Run on a machine in the network to start the routing peer.",
  },
  compose: {
    label: "Docker Compose",
    title: "Run with Docker Compose",
    description: "Run on a machine in the network to start the routing peer.",
  },
};

/**
 * The command that installs a routing peer with the setup key. The
 * management URL is only set for deployments that run their own.
 */
export const installCommand = (
  method: InstallMethod,
  setupKey: string,
  hostname: string,
  managementUrl?: string,
) => {
  if (method === "linux") {
    const management = managementUrl
      ? ` \\\n --management-url ${managementUrl}`
      : "";
    return `curl -fsSL https://pkgs.netbird.io/install.sh | sh
netbird up --setup-key ${setupKey} \\
 --hostname ${hostname}${management}`;
  }

  if (method === "docker") {
    const management = managementUrl
      ? `\n -e NB_MANAGEMENT_URL=${managementUrl} \\`
      : "";
    return `docker run -d --restart=unless-stopped \\
 --network host \\
 --cap-add=NET_ADMIN --cap-add=SYS_ADMIN --cap-add=SYS_RESOURCE \\
 -e NB_SETUP_KEY=${setupKey} \\
 -e NB_HOSTNAME=${hostname} \\${management}
 -v netbird-client:/var/lib/netbird \\
 netbirdio/netbird:latest`;
  }

  const management = managementUrl
    ? `\n      - NB_MANAGEMENT_URL=${managementUrl}`
    : "";
  return `services:
  netbird-client:
    image: netbirdio/netbird:latest
    hostname: ${hostname}
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
      - SYS_ADMIN
      - SYS_RESOURCE
    devices:
      - /dev/net/tun
    environment:
      - NB_SETUP_KEY=${setupKey}${management}
    volumes:
      - netbird-client:/var/lib/netbird
volumes:
  netbird-client:`;
};

export const groupPeerIds = (group?: Group) =>
  ((group?.peers ?? []) as (GroupPeer | string)[]).map((p) =>
    typeof p === "string" ? p : p.id,
  );

/** The first member of the group that was not in it when the key was made. */
export const newGroupPeer = (group: Group | undefined, known: string[]) => {
  const peer = ((group?.peers ?? []) as (GroupPeer | string)[]).find(
    (p) => !known.includes(typeof p === "string" ? p : p.id),
  );
  return typeof peer === "string" ? peer : peer?.name;
};
