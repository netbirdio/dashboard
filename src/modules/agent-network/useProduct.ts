import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  agentNetworkHome,
  hasAgentNetworkGrant,
  NETWORKING_HOME,
  type Product,
  productForPath,
  showProductSwitch,
} from "@/modules/agent-network/product";
import {
  getCurrentProduct,
  setCurrentProduct,
  subscribeCurrentProduct,
} from "@/modules/agent-network/productStore";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";

/**
 * The product the caller is in and whether they can switch.
 *
 * - `switchable`: both products are there for the caller, so the header
 *   shows the product switch.
 * - `product`: the current product. Without the switch it is Networking,
 *   or Agent Network on a dashboard focused on it (`only`). With it, the
 *   route decides, and a page both products show keeps the last product.
 * - `focused`: the sidebar shows the Agent Network surface, the way the
 *   focused mode (`only`) always did.
 * - `homes`: where switching to each product lands.
 * - `select`: makes a product current, before navigating to its home.
 */
export const useProduct = () => {
  const path = usePathname();
  const { permission } = usePermissions();
  const { only, enabled } = useAgentNetworkMode();
  const { configured } = useMyAgentNetworkSetup();
  const stored = useSyncExternalStore(
    subscribeCurrentProduct,
    getCurrentProduct,
    () => undefined,
  );

  const state = useMemo(() => {
    const hasAccess = hasAgentNetworkGrant(permission) || configured;
    const switchable = showProductSwitch({ enabled, only, hasAccess });
    let product: Product = "networking";
    if (only) product = "agent-network";
    else if (switchable) product = productForPath(path, stored);
    const homes: Record<Product, string> = {
      networking: NETWORKING_HOME,
      "agent-network": agentNetworkHome(permission),
    };
    return {
      product,
      switchable,
      focused: product === "agent-network",
      homes,
    } as const;
  }, [path, permission, only, enabled, configured, stored]);

  // Arriving on a route that belongs to one product makes it current, so the
  // pages both products show stay in it afterwards. It runs on navigation
  // only: `select` changes the product before the route follows, and must
  // not be undone by the page it leaves.
  const { switchable } = state;
  useEffect(() => {
    if (!switchable || only) return;
    setCurrentProduct(productForPath(path, getCurrentProduct()));
  }, [path, switchable, only]);

  const select = useCallback((product: Product) => {
    setCurrentProduct(product);
  }, []);

  return { ...state, select } as const;
};
