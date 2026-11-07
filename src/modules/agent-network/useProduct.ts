import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  agentNetworkHome,
  hasAgentNetworkGrant,
  NETWORKING_HOME,
  type Product,
  productForPath,
  showProductSwitch,
} from "@/modules/agent-network/product";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useMyAgentNetworkSetup } from "@/modules/agent-network/useMyAgentNetworkSetup";

/**
 * The product the caller is in and whether they can switch.
 *
 * - `switchable`: both products are there for the caller, so the header
 *   shows the product switch.
 * - `product`: the current product. Without the switch it is Networking,
 *   or Agent Network on a dashboard focused on it (`only`).
 * - `focused`: the sidebar shows the Agent Network surface, the way the
 *   focused mode (`only`) always did.
 * - `homes`: where switching to each product lands.
 */
export const useProduct = () => {
  const path = usePathname();
  const { permission } = usePermissions();
  const { only, enabled } = useAgentNetworkMode();
  const { configured } = useMyAgentNetworkSetup();

  return useMemo(() => {
    const hasAccess = hasAgentNetworkGrant(permission) || configured;
    const switchable = showProductSwitch({ enabled, only, hasAccess });
    let product: Product = "networking";
    if (only) product = "agent-network";
    else if (switchable) product = productForPath(path);
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
  }, [path, permission, only, enabled, configured]);
};
