import { useSetNavigationGuard } from "@utils/navigation-guard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";

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

  useSetNavigationGuard(
    hasChanges
      ? (proceed) =>
          void discardAndExit().then((left) => {
            if (left) proceed();
          })
      : null,
  );

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
      router.push(url.pathname + url.search);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hasChanges, router]);

  return null;
};
