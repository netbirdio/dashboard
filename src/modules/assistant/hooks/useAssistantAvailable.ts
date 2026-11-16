"use client";

import { useEffect, useRef, useState } from "react";
import { ACCESS_PATH, type AccessResponse } from "../lib/contract";

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
    const check = async () => {
      let ok = false;
      try {
        const auth = headersRef.current;
        if (!auth) return;
        const res = await fetch(`${host}${ACCESS_PATH}`, { method: "GET", headers: await auth(), redirect: "error" });
        // An account that is not enabled answers 200 with `ok: false`.
        ok = res.ok && ((await res.json()) as AccessResponse).ok === true;
      } catch {
        ok = false;
      }
      if (!cancelled) setAvailable(ok);
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [host, signedIn]);

  return available;
}
