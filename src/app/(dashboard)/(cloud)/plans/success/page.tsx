"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRedirect } from "@hooks/useRedirect";
import React from "react";

export default function PlanSuccess() {
  useRedirect("/settings?tab=plans-and-billing&success=true");
  return <FullScreenLoading fullScreen={false} />;
}
