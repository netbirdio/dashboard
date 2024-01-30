import FullScreenLoading from "@components/ui/FullScreenLoading";
import useFetchApi from "@utils/api";
import React, { useMemo } from "react";
import { User } from "@/interfaces/User";

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

  return !isLoading ? (
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
  const isOwner = loggedInUser ? loggedInUser?.role === "owner" : false;
  const isAdmin = loggedInUser ? loggedInUser?.role === "admin" : false;
  const isUser = !isOwner && !isAdmin;
  const isOwnerOrAdmin = isOwner || isAdmin;
  return { loggedInUser, isOwner, isAdmin, isUser, isOwnerOrAdmin } as const;
};
