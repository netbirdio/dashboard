/**
 * Spin up a REAL NetBird peer as a docker container that registers with the
 * test management via a setup key. The test env has no signal/TURN, so the
 * peer registers but stays offline (connected:false) — enough for the Peer/User
 * views, which just need a selectable peer.
 *
 * The client MUST talk to management directly (http://management:80), NOT
 * through caddy — the gRPC/h2c handshake breaks through caddy in this env.
 */
import { execSync } from "child_process";
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

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

/**
 * Registers a docker peer and resolves once it appears in /api/peers.
 * `hostname` doubles as the container name and the peer's account name.
 * Optionally assigns the peer to `autoGroupIds` (via the setup key), so it can
 * participate in seeded policies for the Peer view.
 */
export async function registerDockerPeer(
  page: Page,
  hostname: string,
  autoGroupIds: string[] = [],
): Promise<RegisteredPeer> {
  const key = await createSetupKey(page, hostname, autoGroupIds);
  return runDockerPeerWithKey(page, hostname, key.key);
}

/**
 * Runs a docker peer with an ALREADY-GENERATED setup key (e.g. one produced by
 * the in-app "Generate Key" during a placeholder install) and waits for it to
 * appear in /api/peers. Unlike registerDockerPeer it does not mint a key.
 */
export async function runDockerPeerWithKey(
  page: Page,
  hostname: string,
  key: string,
): Promise<RegisteredPeer> {
  // Clean any stale container with the same name from a previous run.
  removeDockerContainer(hostname);
  sh(
    [
      "docker run -d",
      `--name ${hostname}`,
      `--network ${NETWORK}`,
      "--cap-add=NET_ADMIN --cap-add=SYS_ADMIN",
      `-e NB_SETUP_KEY=${key}`,
      `-e NB_MANAGEMENT_URL=${MGMT_URL}`,
      `-e NB_HOSTNAME=${hostname}`,
      IMAGE,
    ].join(" "),
  );
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

/** Just removes the container (peer/key cleanup is caller's responsibility). */
export function removeDockerContainer(hostname: string) {
  try {
    sh(`docker rm -f ${hostname}`);
  } catch {
    /* none */
  }
}

/** Tears down the container and deletes the peer + its setup key. */
export async function cleanupDockerPeer(page: Page, hostname: string) {
  removeDockerContainer(hostname);
  await deletePeersByPrefix(page, hostname);
  await deleteSetupKeysByPrefix(page, hostname);
}
