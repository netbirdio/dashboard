"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
  const router = useRouter();
  useEffect(() => {
    router.push("/peers");
  });

  return <FullScreenLoading />;
}
