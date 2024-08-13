import { useLayoutEffect, useRef, useState } from "react";

export function usePortalElement<Element>() {
  const ref = useRef<Element>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useLayoutEffect(() => {
    setPortalTarget(ref.current);
  }, []);

  return { ref, portalTarget, setPortalTarget };
}
