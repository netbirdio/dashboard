import { TabsTrigger } from "@components/Tabs";
import { ShieldCheck } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  disabled?: boolean;
};

export const PostureCheckTabTrigger = ({ disabled = false }: Props) => {
  const t = useTranslations();
  return (
    <TabsTrigger value={"posture_checks"} disabled={disabled}>
      <ShieldCheck size={16} />
      {t("common.postureChecks")}
    </TabsTrigger>
  );
};
