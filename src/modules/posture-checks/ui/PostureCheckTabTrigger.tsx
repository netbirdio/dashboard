import { TabsTrigger } from "@components/Tabs";
import { ShieldCheck } from "lucide-react";
import * as React from "react";

export const PostureCheckTabTrigger = () => {
  return (
    <TabsTrigger value={"posture_checks"}>
      <ShieldCheck size={16} />
      Posture Checks
    </TabsTrigger>
  );
};
