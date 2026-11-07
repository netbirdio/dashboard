"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { cn } from "@utils/helpers";
import { useGuardedRouter } from "@utils/navigation-guard";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import type { Product } from "@/modules/agent-network/product";
import { useProduct } from "@/modules/agent-network/useProduct";

const PRODUCTS: {
  id: Product;
  name: string;
  description: string;
  Icon: typeof AgentNetworkIcon;
}[] = [
  {
    id: "networking",
    name: "Networking",
    description: "Peers, access control, networks, DNS and reverse proxy",
    Icon: NetworkRoutesIcon,
  },
  {
    id: "agent-network",
    name: "Agent Network",
    description: "AI gateway for agents: providers, policies and usage",
    Icon: AgentNetworkIcon,
  },
];

/**
 * Switches between the dashboard's two products, Networking and Agent
 * Network. It sits next to the logo and shows only when the caller has
 * both; the product itself follows the route (see product.ts).
 */
export const ProductSwitcher = () => {
  const { switchable, product, homes } = useProduct();
  const router = useGuardedRouter();
  const [open, setOpen] = useState(false);

  if (!switchable) return null;
  const current = PRODUCTS.find((p) => p.id === product) ?? PRODUCTS[0];

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"default-outline"}
          className={"h-10 pl-2 pr-2.5 gap-2"}
          data-testid={"product-switcher"}
          aria-label={`Product: ${current.name}. Switch product`}
        >
          <ProductMark Icon={current.Icon} small />
          <span className={"hidden sm:inline text-sm font-medium"}>
            {current.name}
          </span>
          <ChevronsUpDown size={14} className={"shrink-0 text-nb-gray-300"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={"w-80"} align={"start"} sideOffset={8}>
        {PRODUCTS.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => {
              setOpen(false);
              if (p.id !== product) router.push(homes[p.id]);
            }}
          >
            <div className={"flex gap-3 items-center w-full py-1"}>
              <ProductMark Icon={p.Icon} />
              <div className={"flex flex-col gap-0.5 min-w-0"}>
                <span className={"text-sm text-nb-gray-100 font-medium"}>
                  {p.name}
                </span>
                <span className={"text-xs text-nb-gray-400 whitespace-normal"}>
                  {p.description}
                </span>
              </div>
              <CheckIcon
                size={14}
                aria-label={p.id === product ? "Current product" : undefined}
                className={cn(
                  "ml-auto shrink-0 text-netbird",
                  p.id !== product && "invisible",
                )}
              />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* The square product mark, the same shape as the MSP switcher's tenant mark. */
const ProductMark = ({
  Icon,
  small = false,
}: {
  Icon: typeof AgentNetworkIcon;
  small?: boolean;
}) => (
  <div
    className={cn(
      "bg-nb-gray-900 border border-nb-gray-800 flex items-center shrink-0 rounded-[4px] justify-center",
      small ? "w-6 h-6" : "w-8 h-8",
    )}
  >
    <Icon
      size={iconSize(Icon, small)}
      autoHeight={Icon === NetworkRoutesIcon}
      className={"fill-netbird text-netbird shrink-0"}
    />
  </div>
);

/* The Agent Network sparkles fill less of their box than the routes mark,
   so they get a larger box to read at the same weight. */
const iconSize = (Icon: typeof AgentNetworkIcon, small: boolean) => {
  if (Icon === AgentNetworkIcon) return small ? 18 : 22;
  return small ? 12 : 14;
};
