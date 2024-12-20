import { uniq } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import type { Group } from "@/interfaces/Group";

export const useGroupIdsToGroups = (initial?: string[]) => {
  const { groups, isLoading } = useGroups();
  const [initialSet, setInitialSet] = useState(false);
  const [mappedGroups, setMappedGroups] = useState<Group[] | undefined>(
    undefined,
  );

  useEffect(() => {
    // Only run the mapping once when groups are loaded and initial IDs are available
    if (!initialSet && !isLoading && groups && initial) {
      const mapped = uniq(initial)
        .map((group) => groups.find((g) => g?.id === group))
        .filter((g): g is Group => g !== undefined);
      setMappedGroups(mapped);
      setInitialSet(true); // Mark that we've done the initial mapping to prevent subsequent runs
    }
  }, [groups, initial, isLoading, initialSet]);

  return useMemo(() => mappedGroups, [mappedGroups]);
};
