import FullScreenLoading from "@components/ui/FullScreenLoading";
import useFetchApi from "@utils/api";
import { isNetBirdHosted } from "@utils/netbird";
import React, { useMemo } from "react";
import { Permission } from "@/interfaces/Permission";
import { Role, User } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
};

const UsersContext = React.createContext(
  {} as {
    users: User[] | undefined;
    refresh: () => void;
    loggedInUser: User | undefined;
  },
);

export default function UsersProvider({ children }: Props) {
  const { data: users, mutate, isLoading } = useFetchApi<User[]>("/users");

  const refresh = () => {
    mutate().then();
  };

  const loggedInUser = useMemo(() => {
    return users?.find((user) => user.is_current);
  }, [users]);

  return !isLoading && loggedInUser ? (
    <UsersContext.Provider value={{ users, refresh, loggedInUser }}>
      {children}
    </UsersContext.Provider>
  ) : (
    <FullScreenLoading />
  );
}

export const useUsers = () => React.useContext(UsersContext);

export const useLoggedInUser = () => {
  const { loggedInUser } = useUsers();
  const isOwner = loggedInUser ? loggedInUser?.role === Role.Owner : false;
  const isAdmin = loggedInUser ? loggedInUser?.role === Role.Admin : false;
  const isBillingAdmin = isNetBirdHosted()
    ? loggedInUser
      ? loggedInUser?.role === Role.BillingAdmin
      : false
    : false;
  const isUser = !isOwner && !isAdmin;
  const isOwnerOrAdmin = isOwner || isAdmin;

  const permission = useMemo(() => {
    return {
      dashboard_view: loggedInUser?.permissions.dashboard_view || "blocked",
    } as Permission;
  }, [loggedInUser]);

  return {
    loggedInUser,
    isOwner,
    isAdmin,
    isUser,
    isBillingAdmin,
    isOwnerOrAdmin,
    permission,
  } as const;
};
