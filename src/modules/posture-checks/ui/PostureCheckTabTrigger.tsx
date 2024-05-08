import { TabsTrigger } from "@components/Tabs";
import { ShieldCheck } from "lucide-react";
import * as React from "react";

type Props = {
  disabled?: boolean;
};

export const PostureCheckTabTrigger = ({ disabled = false }: Props) => {
  return (
    <TabsTrigger value={"posture_checks"} disabled={disabled}>
      <ShieldCheck size={16} />
      Posture Checks
    </TabsTrigger>
  );
};
