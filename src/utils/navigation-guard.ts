import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type NavigationGuard = (proceed: () => void) => void;

let activeGuard: NavigationGuard | null = null;

export function setNavigationGuard(guard: NavigationGuard) {
  activeGuard = guard;
}

export function clearNavigationGuard(guard: NavigationGuard) {
  if (activeGuard === guard) activeGuard = null;
}

const INSTALLED = Symbol.for("netbird.navigation-guard-installed");

export function installNavigationGuard(router: AppRouterInstance) {
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
