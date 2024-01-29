"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRedirect } from "@hooks/useRedirect";

export default function Home() {
  useRedirect("/peers");
  return <FullScreenLoading />;
}
