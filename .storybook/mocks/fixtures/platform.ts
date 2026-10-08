import type { Handler } from "./index";
import { agentNetworkFixtures } from "./platform-agent-network";
import { cloudFixtures } from "./platform-cloud";
import { publicFixtures } from "./platform-public";
import { reverseProxyFixtures } from "./platform-reverse-proxy";

export const platformFixtures: Record<string, Handler> = {
  ...reverseProxyFixtures,
  ...agentNetworkFixtures,
  ...cloudFixtures,
  ...publicFixtures,
};
