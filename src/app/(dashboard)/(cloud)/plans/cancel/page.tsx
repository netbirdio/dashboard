"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRedirect } from "@hooks/useRedirect";

export default function PlanCancel() {
  useRedirect("/settings?tab=plans-and-billing");
  return <FullScreenLoading fullScreen={false} />;
}
