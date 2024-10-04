import { useEffect, useMemo, useRef } from "react";
import { Group } from "@/interfaces/Group";

const useSortedDropdownOptions = (
  dropdownOptions: Group[],
  values: Group[],
  isPopupOpen: boolean,
): Group[] => {
  const sortOrderRef = useRef<Map<string, number>>(new Map());
  const prevValuesRef = useRef<Group[]>([]);

  // Update sort order when values change and popup is closed
  useEffect(() => {
    if (
      !isPopupOpen &&
      JSON.stringify(values) !== JSON.stringify(prevValuesRef.current)
    ) {
      sortOrderRef.current = new Map(
        values.map((group, index) => [group.name, index]),
      );
      prevValuesRef.current = values;
    }
  }, [values, isPopupOpen]);

  // Sort the dropdown options based on the current sort order
  return useMemo(() => {
    const sortOrder = sortOrderRef.current;
    return [...dropdownOptions].sort((a, b) => {
      const indexA = sortOrder.get(a.name) ?? Infinity;
      const indexB = sortOrder.get(b.name) ?? Infinity;
      return indexA - indexB;
    });
  }, [dropdownOptions, sortOrderRef.current]);
};

export default useSortedDropdownOptions;
