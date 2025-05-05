import React, { useMemo } from "react";
import { Permissions } from "@/interfaces/Permission";
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
      permission: permissions.modules,
    };
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={data}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => React.useContext(PermissionsContext);
