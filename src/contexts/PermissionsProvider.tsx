import React, { useMemo } from "react";
import { Permission, Permissions } from "@/interfaces/Permission";
import { User } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
  user: User;
};

const PermissionsContext = React.createContext(
  {} as {
    isRestricted: boolean;
    permission: Permissions["modules"];
  },
);

const MODULE_KEYS: Array<keyof Permissions["modules"]> = [
  "peers",
  "groups",
  "setup_keys",
  "policies",
  "assistant",
  "networks",
  "routes",
  "nameservers",
  "dns",
  "users",
  "pats",
  "events",
  "settings",
  "accounts",
  "billing",
  "identity_providers",
  "edr",
  "event_streaming",
  "idp",
  "msp",
  "tenants",
  "proxy",
  "proxy_configuration",
  "services",
];

const DENIED: Permission = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

/**
 * Fills in modules absent from the management response, e.g. premium modules
 * that the open-source management server does not report, so consumers can
 * read permission flags without guarding against undefined modules.
 */
const withDefaultModules = (
  modules: Permissions["modules"],
): Permissions["modules"] => {
  const complete = { ...modules };
  MODULE_KEYS.forEach((key) => {
    if (!complete[key]) complete[key] = { ...DENIED };
  });
  return complete;
};

export default function PermissionsProvider({
  children,
  user,
}: Readonly<Props>) {
  const permissions = useMemo(() => {
    return user.permissions;
  }, [user]);

  const data = useMemo(() => {
    return {
      isRestricted: permissions.is_restricted,
      permission: withDefaultModules(permissions.modules),
    };
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={data}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => React.useContext(PermissionsContext);
