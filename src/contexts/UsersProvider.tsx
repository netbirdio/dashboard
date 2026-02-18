import { useOidc } from "@axa-fr/react-oidc";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import useFetchApi from "@utils/api";
import loadConfig from "@utils/config";
import React, { useMemo } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import PermissionsProvider from "@/contexts/PermissionsProvider";
import { Role, User } from "@/interfaces/User";

const config = loadConfig();

type Props = {
  children: React.ReactNode;
};

const UsersContext = React.createContext(
  {} as {
    users: User[] | undefined;
    refresh: () => void;
    isLoading: boolean;
  },
);

const UserProfileContext = React.createContext(
  {} as {
    loggedInUser: User | undefined;
  },
);

export default function UsersProvider({ children }: Readonly<Props>) {
  const { data: users, mutate, isLoading } = useFetchApi<User[]>(
    "/users?service_user=false",
  );
  const { data: serviceUsers, mutate: mutateServiceUsers, isLoading: isLoadingServiceUsers } = useFetchApi<
    User[]
  >("/users?service_user=true");

  const refresh = () => {
    mutate().then();
    mutateServiceUsers().then();
  };

  const allUsers = useMemo(() => {
    return [...(users ?? []), ...(serviceUsers ?? [])];
  }, [users, serviceUsers]);

  return (
    <UsersContext.Provider
      value={{
        users: allUsers,
        refresh,
        isLoading: isLoading || isLoadingServiceUsers,
      }}
    >
      <UserProfileProvider>{children}</UserProfileProvider>
    </UsersContext.Provider>
  );
}

export const useUsers = () => React.useContext(UsersContext);

const UserProfileProvider = ({ children }: Props) => {
  const { users, isLoading: isAllUsersLoading } = useUsers();
  const {
    data: user,
    error,
    isLoading,
  } = useFetchApi<User>("/users/current", true, true, true, {
    key: "user-profile",
  });

  const loggedInUser = useMemo(() => {
    if (isLoading) return undefined;
    if (user) return user;
    if (isAllUsersLoading) return undefined;
    if (!user || error) {
      return users?.find((u) => u?.is_current);
    }
  }, [user, error, users, isLoading, isAllUsersLoading]);

  const data = useMemo(() => {
    return {
      loggedInUser,
    };
  }, [loggedInUser]);

  // Show loading only when we're still loading and don't have user data
  if (isLoading || !loggedInUser) {
    return <FullScreenLoading />;
  }

  // For blocked or pending approval users, we still need to provide the context
  // so they can access their user data on the blocked page
  return (
    <UserProfileContext.Provider value={data}>
      <PermissionsProvider user={loggedInUser}>{children}</PermissionsProvider>
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => React.useContext(UserProfileContext);

export const useLoggedInUser = () => {
  const { loggedInUser } = useUserProfile();
  const { logout: oidcLogout } = useOidc();
  const { setGlobalApiParams } = useApplicationContext();
  const isOwner = loggedInUser ? loggedInUser?.role === Role.Owner : false;
  const isAdmin = loggedInUser ? loggedInUser?.role === Role.Admin : false;

  const isUser = !isOwner && !isAdmin;
  const isOwnerOrAdmin = isOwner || isAdmin;

  const logout = async () => {
    return oidcLogout("/", { client_id: config.clientId }).then(() => {
      setGlobalApiParams?.({});
    });
  };

  return {
    loggedInUser,
    isOwner,
    isAdmin,
    isUser,
    isOwnerOrAdmin,
    logout,
  } as const;
};
