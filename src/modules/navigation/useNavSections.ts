import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  isSectionOpen,
  NAV_SECTIONS_STORAGE_KEY,
  type NavSectionId,
  openSections,
  sectionsForPath,
  setSectionOpen,
  type StoredNavSections,
} from "@/modules/navigation/sections";

/**
 * Open and closed sidebar sections, remembered per user in localStorage.
 * The sections that list the current page are highlighted and open on every
 * navigation; the user can still close them while they stay on the page.
 */
export const useNavSections = (user: string = "") => {
  const path = usePathname();
  const [stored, setStored] = useLocalStorage<StoredNavSections>(
    NAV_SECTIONS_STORAGE_KEY,
    {},
  );
  const active = useMemo(() => sectionsForPath(path), [path]);

  useEffect(() => {
    const next = openSections(stored, user, active);
    if (next !== stored) setStored(next);
    // Only on navigation (or once the user is known): a section the user
    // closes on the current page stays closed until they move on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, user]);

  const isOpen = useCallback(
    (id: NavSectionId) => isSectionOpen(stored?.[user], id),
    [stored, user],
  );
  const setOpen = useCallback(
    (id: NavSectionId, open: boolean) =>
      setStored((prev) => setSectionOpen(prev, user, id, open)),
    [setStored, user],
  );
  const isActive = useCallback(
    (id: NavSectionId) => active.includes(id),
    [active],
  );

  return { isOpen, setOpen, isActive };
};
