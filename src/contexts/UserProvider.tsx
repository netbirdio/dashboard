import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
  user: User;
};

const UserContext = React.createContext(
  {} as {
    user: User;
  },
);

export default function UserProvider({ children, user }: Props) {
  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
}

export const useUserContext = () => React.useContext(UserContext);
