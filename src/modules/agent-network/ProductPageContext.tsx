"use client";

import { BreadcrumbRootContext } from "@components/Breadcrumbs";
import { NetworkIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { type Product, PRODUCT_NAMES } from "@/modules/agent-network/product";
import {
  useProduct,
  useProductUrlSync,
} from "@/modules/agent-network/useProduct";

const CRUMB_ICONS: Record<Product, React.ReactNode> = {
  networking: <NetworkIcon size={14} />,
  "agent-network": <AgentNetworkIcon size={16} />,
};

/**
 * Wraps the page with what the current product means for it: the URL names
 * the product (useProductUrlSync), and every breadcrumb trail starts with
 * it, so a page both products show says which one it is in. That trail root
 * and the header's product switch are the two places the product shows.
 */
export const ProductPageContext = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  useProductUrlSync();
  const { crumb, homes } = useProduct();
  const root = useMemo(
    () =>
      crumb
        ? {
            label: PRODUCT_NAMES[crumb],
            href: homes[crumb],
            icon: CRUMB_ICONS[crumb],
          }
        : null,
    [crumb, homes],
  );
  return (
    <BreadcrumbRootContext.Provider value={root}>
      {children}
    </BreadcrumbRootContext.Provider>
  );
};
