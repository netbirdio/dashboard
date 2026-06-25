import { useApiCall } from "@utils/api";
import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { User } from "@/interfaces/User";

const USERS_GROUP_NAME = "Users";

// useEnsureUsersGroup guarantees there's a usable source group before the
// operator reaches the policy step. A fresh Agent Network install has no
// selectable groups, so the policy source picker would be empty. We create a
// "Users" group (once) and add the current user to it via auto_groups, so the
// policy step has a ready source group that already contains the operator —
// and any device they connect during onboarding inherits the group on enroll.
//
// Idempotent: it no-ops when the group already exists and the user is already a
// member. Best-effort: on failure it lets a later mount retry, and the operator
// can still create a group by hand in the policy modal.
export function useEnsureUsersGroup(enabled: boolean) {
  const { groups, createOrUpdate, refresh } = useGroups();
  const { loggedInUser } = useLoggedInUser();
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || ranRef.current) return;
    if (!groups || !loggedInUser) return;
    ranRef.current = true;

    (async () => {
      try {
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
        if (!groupId) return;

        const current = loggedInUser.auto_groups ?? [];
        if (!current.includes(groupId)) {
          await userRequest.put(
            {
              role: loggedInUser.role,
              auto_groups: [...current, groupId],
              is_blocked: loggedInUser.is_blocked ?? false,
            },
            `/${loggedInUser.id}`,
          );
          mutate("/users?service_user=false");
          mutate("/users/current");
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
    createOrUpdate,
    refresh,
    userRequest,
    mutate,
  ]);
}
