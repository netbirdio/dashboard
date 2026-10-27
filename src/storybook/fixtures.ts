import type { Group } from "@/interfaces/Group";
import {
  groups as groupData,
  peers as peerData,
  users as userData,
} from "../../.storybook/mocks/fixtures/core-data";
import { networkResources } from "../../.storybook/mocks/fixtures/network";

export { account } from "../../.storybook/mocks/fixtures/account";
export {
  GROUP,
  NETWORK,
  PEER,
  POLICY,
  POSTURE,
  USER,
} from "../../.storybook/mocks/fixtures/ids";
export {
  distributorInfo,
  edr,
  eventStreams,
  freeSubscription,
  idp,
  mspInfo,
  tenantSwitcher,
  trialSubscription,
} from "../../.storybook/mocks/fixtures/platform-cloud";
import type { NetworkResource } from "@/interfaces/Network";
import type { Peer } from "@/interfaces/Peer";
import type { User } from "@/interfaces/User";

/* Component stories reuse the shared fixtures, which the default API mock
   already serves, so data-bound components resolve the same entities as
   the page stories. Fixture dates are ISO strings, hence the casts. */
export const groups = groupData as unknown as Group[];
export const peers = peerData as unknown as Peer[];
export const users = userData as unknown as User[];

export const group = (id: string) => groups.find((g) => g.id === id)!;

export const resources: NetworkResource[] = [
  networkResources.find((r) => r.type === "host")!,
  networkResources.find((r) => r.type === "subnet")!,
  networkResources.find((r) => r.type === "domain") ?? networkResources[2],
];
