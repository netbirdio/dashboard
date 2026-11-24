"use client";

import { useCallback, useEffect, useRef } from "react";

export const ARMING_DELAY_MS = 500;

export function useArmingDelay(key?: unknown): () => boolean {
  const armed = useRef(false);

  useEffect(() => {
    armed.current = false;
    const timer = setTimeout(() => {
      armed.current = true;
    }, ARMING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key]);

  return useCallback(() => armed.current, []);
}
