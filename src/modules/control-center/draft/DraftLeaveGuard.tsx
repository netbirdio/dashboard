import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";

// Leaving the page while draft changes are pending must not silently discard
// them: closing/reloading the tab triggers the browser's native prompt, and
// in-app navigation — links AND programmatic router.push (the sidebar
// navigates via router.push, not anchors) — is intercepted to show the same
// "Discard draft changes?" dialog as Cancel / switching to Live.
export const DraftLeaveGuard = () => {
  const { isDraft } = useDraftMode();
  const { changeCount } = useDraftChangeset();
  const { discardAndExit } = useDiscardDraft();
  const router = useRouter();
  const hasChanges = isDraft && changeCount > 0;

  useEffect(() => {
    if (!hasChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required by some browsers to actually show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChanges]);

  // useRouter() returns the app-wide router instance, so wrapping push/replace
  // here guards every programmatic navigation (e.g. SidebarItem) while
  // pending changes exist. Restored on cleanup.
  useEffect(() => {
    if (!hasChanges) return;
    const originalPush = router.push.bind(router);
    const originalReplace = router.replace.bind(router);
    const guarded =
      (navigate: typeof originalPush): typeof originalPush =>
      (href, options) => {
        void discardAndExit().then((left) => {
          if (left) navigate(href, options);
        });
      };
    router.push = guarded(originalPush);
    router.replace = guarded(originalReplace);
    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [hasChanges, router, discardAndExit]);

  useEffect(() => {
    if (!hasChanges) return;
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
      void (async () => {
        const left = await discardAndExit();
        if (left) router.push(url.pathname + url.search);
      })();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasChanges, discardAndExit, router]);

  return null;
};
