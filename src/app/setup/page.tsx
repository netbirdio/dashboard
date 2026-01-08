"use client";

import InstanceSetupWizard from "@/modules/instance-setup/InstanceSetupWizard";
import { useInstanceSetup } from "@/contexts/InstanceSetupProvider";
import { useRouter } from "next/navigation";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useEffect } from "react";

export default function SetupPage() {
  const { setupRequired, loading } = useInstanceSetup();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !setupRequired) router.replace("/peers");
  }, [loading, setupRequired]);

  return loading || !setupRequired ? (
    <FullScreenLoading />
  ) : (
    <InstanceSetupWizard />
  );
}
