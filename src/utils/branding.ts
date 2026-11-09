import { globalMetaTitle } from "@utils/meta";

export type Branding = {
  name?: string;
  logoUrl?: string;
  faviconUrl?: string;
};

// brandAssetUrl accepts the address of an image the operator wants shown in
// place of a NetBird one: an http(s) URL, or a path on the dashboard's own
// origin for a file mounted into the container. Anything else (a relative
// path, another scheme, a value left unsubstituted) is dropped, so a bad
// setting falls back to the NetBird asset instead of a broken image.
export const brandAssetUrl = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === "https:" || protocol === "http:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
};

// deploymentBranding turns what an operator sets through NETBIRD_BRAND_NAME,
// NETBIRD_BRAND_LOGO_URL and NETBIRD_BRAND_FAVICON_URL into the branding of
// this deployment. Every part is optional and independent: whatever is unset
// or unusable keeps the NetBird default.
export const deploymentBranding = (
  name?: string,
  logoUrl?: string,
  faviconUrl?: string,
): Branding => ({
  name: name?.trim() || undefined,
  logoUrl: brandAssetUrl(logoUrl),
  faviconUrl: brandAssetUrl(faviconUrl),
});

// brandedTitle swaps the product name that every page title ends with for the
// deployment's own name. Titles are part of the static export, so they are
// rewritten in the browser instead of at build time.
export const brandedTitle = (title: string, name?: string): string =>
  name ? title.replaceAll(globalMetaTitle, name) : title;
