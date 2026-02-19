"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Team() {
  const router = useRouter();

  useEffect(() => {
    router.push("/team/users");
  }, [router]);

  return <FullScreenLoading fullScreen={false} />;
}
