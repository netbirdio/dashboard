import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUserProfile } from "@/contexts/UsersProvider";
import {
  agentNetworkHome,
  canonicalSearch,
  crumbProduct,
  hasAgentNetworkGrant,
  NETWORKING_HOME,
  type Product,
  PRODUCT_PARAM,
  productHomes,
  productHref,
  resolveProduct,
  showProductSwitch,
} from "@/modules/agent-network/product";
import {
  getLastProduct,
  setLastProduct,
  subscribeLastProduct,
} from "@/modules/agent-network/productStore";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";

/**
 * The product the caller is in and whether they can switch (see product.ts
 * for the rules).
 *
 * - `switchable`: both products are there for the caller, so the header
 *   shows the product switch.
 * - `only`: the account or deployment is Agent Network only.
 * - `product`: the current product, from the route, then `?product=`, then
 *   the product the user was last in.
 * - `crumb`: the product the breadcrumb trail starts with, if any.
 * - `homes`: where switching to each product, or the logo, lands.
 * - `link`: an in-app link that keeps the current product. Only callers
 *   with the switch get `?product=`; for everyone else there is one
 *   product and the URLs stay as they always were.
 * - `select`: remembers a product as the user's last one, before the
 *   switch navigates to its home.
 */
export const useProduct = () => {
  const path = usePathname();
  const param = useSearchParams()?.get(PRODUCT_PARAM);
  const { permission } = usePermissions();
  const { loggedInUser } = useUserProfile();
  const userId = loggedInUser?.id;
  const { only, enabled } = useAgentNetworkMode();
  const { configured } = useMyAgentNetworkSetup();
  const remembered = useSyncExternalStore(
    subscribeLastProduct,
    () => getLastProduct(userId),
    () => undefined,
  );

  const state = useMemo(() => {
    const hasAccess = hasAgentNetworkGrant(permission) || configured;
    const switchable = showProductSwitch({ enabled, only, hasAccess });
    const product = resolveProduct({
      path,
      param,
      remembered,
      switchable,
      only,
    });
    const homes: Record<Product, string> = switchable
      ? productHomes(permission)
      : {
          networking: NETWORKING_HOME,
          "agent-network": agentNetworkHome(permission),
        };
    return {
      product,
      switchable,
      only,
      crumb: crumbProduct({ path, product, switchable, only }),
      homes,
    } as const;
  }, [path, param, remembered, permission, only, enabled, configured]);

  const { switchable, product } = state;
  const link = useCallback(
    (href: string) => (switchable ? productHref(href, product) : href),
    [switchable, product],
  );

  const select = useCallback(
    (next: Product) => setLastProduct(userId, next),
    [userId],
  );

  return { ...state, link, select } as const;
};

/**
 * Keeps the URL and the remembered product in step with the current
 * product. Mounted once, in the dashboard layout.
 *
 * - The product becomes the user's last one, so a shared page opened later
 *   without `?product=` opens in it.
 * - A shared page gets `?product=` when its URL doesn't name the product
 *   (in-page links such as a peer's row link to `/peer?id=…` only), and the
 *   pages of one product lose a stray one, so the address bar always shows
 *   what a copied link will open.
 *
 * It replaces the URL in place with the plain router: the page stays, so
 * there is nothing for the navigation guard to protect, and the guard's
 * leave prompt must not fire for it.
 */
export const useProductUrlSync = () => {
  const path = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loggedInUser } = useUserProfile();
  const userId = loggedInUser?.id;
  const { product, switchable } = useProduct();
  const search = searchParams?.toString() ?? "";

  useEffect(() => {
    // Without the switch there is one product and nothing to name.
    if (!switchable || !path) return;
    setLastProduct(userId, product);
    const next = canonicalSearch(path, search, product);
    if (next === undefined) return;
    router.replace(next ? `${path}?${next}` : path, { scroll: false });
  }, [switchable, product, path, search, userId, router]);
};
