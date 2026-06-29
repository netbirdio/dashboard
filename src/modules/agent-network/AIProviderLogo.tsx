"use client";

import { cn } from "@utils/helpers";
import React from "react";
import { AIProviderId } from "@/modules/agent-network/data/mockData";
import { useProviderCatalog } from "@/modules/agent-network/useProviderCatalog";

type Props = {
  providerId: AIProviderId;
  size?: number;
  className?: string;
};

export default function AIProviderLogo({
  providerId,
  size = 36,
  className,
}: Readonly<Props>) {
  const { getById } = useProviderCatalog();
  const entry = getById(providerId);
  const initial = entry ? entry.name.charAt(0) : "?";
  const bg = entry?.brand_color ?? "#6B7280";

  return (
    <div
      className={cn(
        "rounded-md flex items-center justify-center font-semibold shrink-0 text-white shadow-sm",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.floor(size * 0.45),
      }}
    >
      {initial}
    </div>
  );
}
