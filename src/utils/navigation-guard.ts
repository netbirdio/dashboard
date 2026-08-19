import type { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type AppRouterInstance = ReturnType<typeof useRouter>;

export type NavigationGuard = (proceed: () => void) => void;

let activeGuard: NavigationGuard | null = null;

export function setNavigationGuard(guard: NavigationGuard) {
  activeGuard = guard;
}

export function clearNavigationGuard(guard: NavigationGuard) {
  if (activeGuard === guard) activeGuard = null;
}

export function useSetNavigationGuard(guard: NavigationGuard | null) {
  const guardRef = useRef(guard);
  useEffect(() => {
    guardRef.current = guard;
  });
  const enabled = guard !== null;
  useEffect(() => {
    if (!enabled) return;
    const stable: NavigationGuard = (proceed) => guardRef.current?.(proceed);
    setNavigationGuard(stable);
    return () => clearNavigationGuard(stable);
  }, [enabled]);
}

const INSTALLED = Symbol.for("netbird.navigation-guard-installed");

function getSharedAppRouter(): AppRouterInstance | undefined {
  return (window as { next?: { router?: AppRouterInstance } }).next?.router;
}

export function useNavigationGuard() {
  if (typeof window === "undefined") return;
  installNavigationGuard();
}

function installNavigationGuard() {
  const router = getSharedAppRouter();
  if (!router?.push || !router.replace) {
    console.error(
      "navigation-guard: window.next.router is unavailable; " +
        "programmatic navigation will not be guarded.",
    );
    return;
  }
  const target = router as AppRouterInstance &
    Record<symbol, boolean | undefined>;
  if (target[INSTALLED]) return;
  target[INSTALLED] = true;

  const guarded =
    <A extends unknown[]>(original: (...args: A) => void) =>
    (...args: A) => {
      const guard = activeGuard;
      if (!guard) return original(...args);
      guard(() => original(...args));
    };

  router.push = guarded(router.push.bind(router));
  router.replace = guarded(router.replace.bind(router));
}
