"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ReverseProxyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reverse-proxy/services");
  }, [router]);

  return <FullScreenLoading height={"auto"} />;
}
