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

    const apply = () => {
      const title = brandedTitle(document.title, name);
      if (title !== document.title) document.title = title;

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
    });
    return () => observer.disconnect();
  }, [name, faviconUrl]);

  return null;
};
