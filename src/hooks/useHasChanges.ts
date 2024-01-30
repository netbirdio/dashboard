import { isEqual, sortBy } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

export function useHasChanges(array: any[]) {
  const initialArrayRef = useRef(sortBy(array));
  const [hasChanges, setHasChanges] = useState(false);

  const updateRef = useCallback((newArray: any[]) => {
    initialArrayRef.current = sortBy(newArray);
    setHasChanges(false);
  }, []);

  useEffect(() => {
    setHasChanges(!isEqual(sortBy(array), initialArrayRef.current));
  }, [array]);

  return { hasChanges, updateRef };
}
