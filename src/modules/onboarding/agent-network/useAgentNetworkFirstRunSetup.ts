import useFetchApi, { useApiCall } from "@utils/api";
import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import {
  LOGGED_IN_USER_KEY,
  useLoggedInUser,
} from "@/contexts/UsersProvider";
import { Policy } from "@/interfaces/Policy";
import { User } from "@/interfaces/User";

const USERS_GROUP_NAME = "Users";
const DEFAULT_POLICY_NAME = "Default";

// How many times the user is put in the Users group before giving up, and how
// long to wait before checking that it held.
const MEMBERSHIP_ATTEMPTS = 3;
const MEMBERSHIP_CHECK_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// useAgentNetworkFirstRunSetup prepares the account for the Agent Network
// onboarding, before the operator reaches the policy step. It runs once,
// idempotently, and is best-effort (a failure resets so a later mount retries;
// the operator can still do these by hand).
//
// Two things, both because a fresh install is the wrong shape for Agent Network:
//   1. Create a "Users" source group and add the current user to it. A fresh
//      install has no selectable group, so the policy source picker is empty;
//      seeding the user's own group gives the policy step a ready source.
//   2. Remove the regular Access Control "Default" policy. That seeded policy
//      is a permissive allow-all for the VPN product; Agent Network is
//      deny-by-default and shouldn't ship with a blanket allow rule.
export function useAgentNetworkFirstRunSetup(enabled: boolean) {
  const { groups, createOrUpdate, refresh } = useGroups();
  const { loggedInUser } = useLoggedInUser();
  const { data: policies } = useFetchApi<Policy[]>("/policies");
  const userRequest = useApiCall<User>("/users");
  const policyRequest = useApiCall<Policy>("/policies");
  const { mutate } = useSWRConfig();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || ranRef.current) return;
    if (!groups || !loggedInUser || !policies) return;
    ranRef.current = true;

    // joinGroup adds the group to the current user's auto groups and checks
    // that it held. Management can write back a user it read before the update
    // (its last-login save rewrites the whole row), which drops the group, so
    // the user is read fresh each time and the update is sent again until the
    // group sticks.
    const joinGroup = async (groupId: string) => {
      for (let attempt = 1; ; attempt++) {
        const user = await userRequest.get("/current");
        const current = user.auto_groups ?? [];
        if (current.includes(groupId)) return;
        if (attempt > MEMBERSHIP_ATTEMPTS) {
          throw new Error("could not add the user to the Users group");
        }
        await userRequest.put(
          {
            role: user.role,
            auto_groups: [...current, groupId],
            is_blocked: user.is_blocked ?? false,
          },
          `/${user.id}`,
        );
        await sleep(MEMBERSHIP_CHECK_DELAY_MS);
      }
    };

    (async () => {
      try {
        // 1. Ensure a "Users" source group with the current user in it.
        let group = groups.find((g) => g.name === USERS_GROUP_NAME);
        if (!group) {
          group = await createOrUpdate({
            name: USERS_GROUP_NAME,
            peers: [],
            resources: [],
          });
          refresh();
        }

        const groupId = group?.id;
        if (groupId) {
          await joinGroup(groupId);
          mutate("/users?service_user=false");
          mutate(LOGGED_IN_USER_KEY);
        }

        // 2. Remove the permissive "Default" Access Control policy.
        const defaultPolicy = policies.find(
          (p) => p.name === DEFAULT_POLICY_NAME,
        );
        if (defaultPolicy?.id) {
          await policyRequest.del("", `/${defaultPolicy.id}`);
          mutate("/policies");
        }
      } catch {
        // Allow a later mount to retry.
        ranRef.current = false;
      }
    })();
  }, [
    enabled,
    groups,
    loggedInUser,
    policies,
    createOrUpdate,
    refresh,
    userRequest,
    policyRequest,
    mutate,
  ]);
}
