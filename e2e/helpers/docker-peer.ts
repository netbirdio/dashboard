// Spins up a real NetBird peer in docker, registering via a setup key. The test
// env has no signal/TURN, so the peer registers but stays offline. The client
// MUST reach management directly (http://management:80); caddy breaks h2c.
import { execFileSync } from "child_process";
import { expect, type Page } from "@playwright/test";
import {
  createSetupKey,
  deletePeersByPrefix,
  deleteSetupKeysByPrefix,
  listPeers,
} from "./api";

const NETWORK = "environment_netbird";
const IMAGE = "netbirdio/netbird:latest";
const MGMT_URL = "http://management:80";

type RegisteredPeer = {
  id: string;
  name: string;
  hostname: string;
  connected: boolean;
};

// argv, not a shell string: the setup key comes back from the management API
// and must never be parsed by a shell.
function docker(args: string[]): string {
  return execFileSync("docker", args, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

// `hostname` doubles as the container name and the peer's account name.
export async function registerDockerPeer(
  page: Page,
  hostname: string,
  autoGroupIds: string[] = [],
): Promise<RegisteredPeer> {
  const key = await createSetupKey(page, hostname, autoGroupIds);
  return runDockerPeerWithKey(page, hostname, key.key);
}

// Runs a peer with an already-generated setup key instead of minting one.
export async function runDockerPeerWithKey(
  page: Page,
  hostname: string,
  key: string,
): Promise<RegisteredPeer> {
  removeDockerContainer(hostname);
  docker([
    "run",
    "-d",
    "--name",
    hostname,
    "--network",
    NETWORK,
    "--cap-add=NET_ADMIN",
    "--cap-add=SYS_ADMIN",
    "-e",
    `NB_SETUP_KEY=${key}`,
    "-e",
    `NB_MANAGEMENT_URL=${MGMT_URL}`,
    "-e",
    `NB_HOSTNAME=${hostname}`,
    IMAGE,
  ]);
  let found: RegisteredPeer | undefined;
  await expect
    .poll(
      async () => {
        found = ((await listPeers(page)) as RegisteredPeer[]).find(
          (p) => p.name === hostname,
        );
        return !!found;
      },
      { timeout: 45_000, intervals: [2000, 2000, 3000] },
    )
    .toBe(true);
  return found!;
}

// Peer and setup-key cleanup is the caller's responsibility.
export function removeDockerContainer(hostname: string) {
  try {
    docker(["rm", "-f", hostname]);
  } catch {
    /* none */
  }
}

export async function cleanupDockerPeer(page: Page, hostname: string) {
  removeDockerContainer(hostname);
  await deletePeersByPrefix(page, hostname);
  await deleteSetupKeysByPrefix(page, hostname);
}
