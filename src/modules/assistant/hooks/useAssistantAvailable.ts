"use client";

import { useEffect, useRef, useState } from "react";
import { ACCESS_PATH, type AccessResponse } from "../lib/contract";

export const ACCESS_RETRY_DELAYS_MS = [1_000, 5_000, 15_000, 60_000];

export function useAssistantAvailable(host: string, headers: (() => Promise<Record<string, string>>) | undefined): boolean {
  const [available, setAvailable] = useState(false);
  const headersRef = useRef(headers);
  headersRef.current = headers;
  const signedIn = headers !== undefined;

  useEffect(() => {
    if (!host || !signedIn) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async (attempt: number) => {
      let ok: boolean | undefined;
      try {
        const auth = headersRef.current;
        if (!auth) return;
        const res = await fetch(`${host}${ACCESS_PATH}`, { method: "GET", headers: await auth(), redirect: "error" });
        // An account that is not enabled answers 200 with `ok: false`.
        if (res.ok) ok = ((await res.json()) as AccessResponse).ok === true;
      } catch {
        ok = undefined;
      }
      if (cancelled) return;
      setAvailable(ok === true);
      const delay = ACCESS_RETRY_DELAYS_MS[attempt];
      if (ok === undefined && delay !== undefined) timer = setTimeout(() => void check(attempt + 1), delay);
    };
    void check(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [host, signedIn]);

  return available;
}
