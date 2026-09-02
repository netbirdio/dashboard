import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

type AppRouterInstance = ReturnType<typeof useRouter>;

export type NavigationGuard = (proceed: () => void) => void;

const guards: NavigationGuard[] = [];

function setNavigationGuard(guard: NavigationGuard) {
  guards.push(guard);
}

function clearNavigationGuard(guard: NavigationGuard) {
  const index = guards.lastIndexOf(guard);
  if (index !== -1) guards.splice(index, 1);
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

// Guarded at the CALL SITE: the App Router exposes no global instance to patch.
// Anything that can navigate away from guarded work pushes through this.
export function useGuardedRouter(): AppRouterInstance {
  const router = useRouter();
  return useMemo(() => {
    const guarded =
      <A extends unknown[]>(original: (...args: A) => void) =>
      (...args: A) => {
        const guard = guards[guards.length - 1];
        if (!guard) return original(...args);
        guard(() => original(...args));
      };
    return {
      ...router,
      push: guarded(router.push.bind(router)),
      replace: guarded(router.replace.bind(router)),
      back: guarded(router.back.bind(router)),
      forward: guarded(router.forward.bind(router)),
      refresh: guarded(router.refresh.bind(router)),
    };
  }, [router]);
}
