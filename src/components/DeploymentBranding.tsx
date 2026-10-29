"use client";

import { brandedTitle, type Branding } from "@utils/branding";
import loadConfig from "@utils/config";
import { useEffect } from "react";

const config = loadConfig();

type Props = {
  branding?: Branding;
};

// DeploymentBranding applies the operator's name and favicon to the document.
// Both live in the <head> of the static export, which Next.js rewrites on
// navigation, so they are reapplied whenever the head changes.
export const DeploymentBranding = ({ branding = config.branding }: Props) => {
  const { name, faviconUrl } = branding;

  useEffect(() => {
    if (!name && !faviconUrl) return;

    // The observer also sees the title this component writes. A name that
    // contains the product name would be branded again on every pass, so the
    // last written title is left alone.
    let written: string | undefined;

    const apply = () => {
      if (document.title !== written) {
        written = brandedTitle(document.title, name);
        if (written !== document.title) document.title = written;
      }

      if (!faviconUrl) return;
      document
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
        .forEach((link) => {
          if (link.getAttribute("href") === faviconUrl) return;
          link.removeAttribute("type");
          link.removeAttribute("sizes");
          link.href = faviconUrl;
        });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    return () => observer.disconnect();
  }, [name, faviconUrl]);

  return null;
};
