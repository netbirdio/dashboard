"use client";

import InstanceSetupWizard from "@/modules/instance-setup/InstanceSetupWizard";
import { useInstanceSetup } from "@/contexts/InstanceSetupProvider";
import { useRouter } from "next/navigation";
import FullScreenLoading from "@components/ui/FullScreenLoading";

export default function SetupPage() {
  const { setupRequired, loading } = useInstanceSetup();
  const router = useRouter();

  if (loading) return <FullScreenLoading />;

  if (!setupRequired) {
    router.replace("/peers");
    return <FullScreenLoading />;
  }

  return <InstanceSetupWizard />;
}
