import { usePermissions } from "@/contexts/PermissionsProvider";

/**
 * Exit nodes used to be network routes and have no permission module of
 * their own yet, so they follow the routes permissions. Change it here once
 * the management API adds one.
 */
export const useExitNodePermissions = () => {
  const { permission } = usePermissions();
  return permission.routes;
};
