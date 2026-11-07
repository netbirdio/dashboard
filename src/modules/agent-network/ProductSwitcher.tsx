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
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import type { Product } from "@/modules/agent-network/product";
import { useProduct } from "@/modules/agent-network/useProduct";

const PRODUCTS: {
  id: Product;
  name: string;
  description: string;
  mark: React.ReactNode;
}[] = [
  {
    id: "networking",
    name: "Networking",
    description: "Peers, access control, networks, DNS and reverse proxy",
    mark: <NetBirdIcon size={16} />,
  },
  {
    id: "agent-network",
    name: "Agent Network",
    description: "AI gateway for agents: providers, policies and usage",
    mark: <AgentNetworkIcon size={22} className={"text-netbird shrink-0"} />,
  },
];

/**
 * Switches between the dashboard's two products, Networking and Agent
 * Network. The header places it over the main panel; it shows only when the
 * caller has both, and the product itself follows the route (see product.ts).
 */
export const ProductSwitcher = () => {
  const { switchable, product, homes, select } = useProduct();
  const router = useGuardedRouter();
  const [open, setOpen] = useState(false);

  if (!switchable) return null;
  const current = PRODUCTS.find((p) => p.id === product) ?? PRODUCTS[0];

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"default-outline"}
          className={"h-10 pl-3 pr-2.5 gap-2"}
          data-testid={"product-switcher"}
          aria-label={`Product: ${current.name}. Switch product`}
        >
          <span className={"text-sm font-medium whitespace-nowrap"}>
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
              if (p.id === product) return;
              select(p.id);
              router.push(homes[p.id]);
            }}
          >
            <div className={"flex gap-3 items-center w-full py-1"}>
              <div
                className={
                  "w-8 h-8 bg-nb-gray-900 border border-nb-gray-800 flex items-center shrink-0 rounded-[4px] justify-center"
                }
              >
                {p.mark}
              </div>
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
