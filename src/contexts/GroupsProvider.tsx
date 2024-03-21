import useFetchApi from "@utils/api";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";

type Props = {
  children: React.ReactNode;
};

const GroupContext = React.createContext(
  {} as {
    groups: Group[] | undefined;
    refresh: () => void;
    dropdownOptions: Group[];
    setDropdownOptions: React.Dispatch<React.SetStateAction<Group[]>>;
    isLoading: boolean;
  },
);

export default function GroupsProvider({ children }: Props) {
  const path = usePathname();
  const { isUser } = useLoggedInUser();

  return <GroupsProviderContent>{children}</GroupsProviderContent>;
}

export function GroupsProviderContent({ children }: Props) {
  const { data: groups, mutate, isLoading } = useFetchApi<Group[]>("/groups");
  const [dropdownOptions, setDropdownOptions] = useState<Group[]>([]);

  const refresh = () => {
    if (groups && !isLoading) mutate().then();
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        refresh,
        dropdownOptions,
        setDropdownOptions,
        isLoading,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export const useGroups = () => React.useContext(GroupContext);
