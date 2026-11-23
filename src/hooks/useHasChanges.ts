import { isEqual } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

export function useHasChanges(array: any[]) {
  const initialArrayRef = useRef(array);
  const [hasChanges, setHasChanges] = useState(false);

  const updateRef = useCallback((newArray: any[]) => {
    initialArrayRef.current = newArray;
    setHasChanges(false);
  }, []);

  useEffect(() => {
    setHasChanges(!isEqual(array, initialArrayRef.current));
  }, [array]);

  return { hasChanges, updateRef };
}
