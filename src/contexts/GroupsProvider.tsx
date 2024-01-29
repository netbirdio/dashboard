import useFetchApi from "@utils/api";
import React, { useState } from "react";
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
  },
);

export default function GroupsProvider({ children }: Props) {
  const { data: groups, mutate } = useFetchApi<Group[]>("/groups");
  const [dropdownOptions, setDropdownOptions] = useState<Group[]>([]);

  const refresh = () => {
    mutate().then();
  };

  return (
    <GroupContext.Provider
      value={{ groups, refresh, dropdownOptions, setDropdownOptions }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export const useGroups = () => React.useContext(GroupContext);
