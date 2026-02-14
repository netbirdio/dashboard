"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DNS() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dns/nameservers");
  }, [router]);

  return <FullScreenLoading fullScreen={false} />;
}
