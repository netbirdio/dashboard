import {
  useGuardedRouter,
  useSetNavigationGuard,
} from "@utils/navigation-guard";
import { useEffect, useRef } from "react";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";
import { usePendingArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";

// Marks the extra history entry this guard owns. It carries the SAME url as the
// page, so Back onto the page entry is a no-op navigation the React tree survives.
const GUARD_MARK = "ccDraftGuard";

export const DraftLeaveGuard = () => {
  const { isDraft } = useDraftMode();
  const { changeCount } = useDraftChangeset();
  const { discardAndExit } = useDiscardDraft();
  const hasPendingArtifacts = usePendingArtifacts();
  // The guarded router, not useRouter(): a raw push would walk straight past the
  // guard installed below and take the draft with it.
  const router = useGuardedRouter();
  // `hasChanges` = leaving loses work. `mustSweep` = leaving also strands real API
  // objects: removing the last placeholder zeroes changeCount but not its setup key.
  const hasChanges = isDraft && changeCount > 0;
  const mustSweep = hasChanges || (isDraft && hasPendingArtifacts);

  // Armed on `mustSweep`: no sweep can run during unload, so the prompt is the only
  // chance to leave through discardAndExit, which tears the artifacts down.
  useEffect(() => {
    if (!mustSweep) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers to actually show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mustSweep]);

  // A dialog is in flight — shared by both trigger paths: DialogProvider holds a
  // single resolver, so a second confirm() would orphan the first dialog's promise.
  const askingRef = useRef(false);

  useSetNavigationGuard(
    mustSweep
      ? (proceed) => {
          if (askingRef.current) return;
          askingRef.current = true;
          void discardAndExit().then((left) => {
            askingRef.current = false;
            if (left) proceed();
          });
        }
      : null,
  );

  // Browser Back never reaches the guard above: Next's popstate handler restores
  // the previous route directly instead of going through router.push/replace.

  // go(-2) raises popstate itself, so without this the guard questions its own exit.
  const leavingRef = useRef(false);
  // discardAndExit changes identity on every change; the listener must not.
  const discardRef = useRef(discardAndExit);
  useEffect(() => {
    discardRef.current = discardAndExit;
  }, [discardAndExit]);
  useEffect(() => {
    if (!mustSweep) return;
    const ownsCurrentEntry = () =>
      !!(window.history.state as Record<string, unknown> | null)?.[GUARD_MARK];
    // Undo to zero and redo re-enters this effect; the check stops it stacking.
    if (!ownsCurrentEntry()) window.history.pushState({ [GUARD_MARK]: true }, "");
    leavingRef.current = false;

    const onPopState = (e: PopStateEvent) => {
      const state = e.state as Record<string, unknown> | null;
      // Landing on our own entry means Back consumed something above it; and
      // drill-down levels own their entries and their own Back handling.
      if (state?.[GUARD_MARK] || state?.controlCenterDrill) return;
      if (leavingRef.current) return;
      // Renew unconditionally, even mid-dialog: a spent sentinel lets the next Back
      // walk off the page, and go(-2) below assumes the renewed depth.
      window.history.pushState({ [GUARD_MARK]: true }, "");
      // One dialog at a time; the sentinel above does the blocking meanwhile.
      if (askingRef.current) return;
      askingRef.current = true;
      void discardRef.current().then((left) => {
        askingRef.current = false;
        if (!left) return;
        leavingRef.current = true;
        // Past the sentinel AND the page entry, to where Back was headed.
        window.history.go(-2);
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      askingRef.current = false;
      leavingRef.current = false;
    };
    // Deliberately NOT popped on cleanup: a suppressed history.back() reads as a
    // drill-down Back and collapses a live drill. Costs one inert Back per draft.
  }, [mustSweep]);

  useEffect(() => {
    if (!mustSweep) return;
    // Capture-phase so this runs before Next's <Link> click handler.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const anchor = (e.target as HTMLElement).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      router.push(url.pathname + url.search);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mustSweep, router]);

  return null;
};
