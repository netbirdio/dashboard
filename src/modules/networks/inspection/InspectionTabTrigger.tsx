import { TabsTrigger } from "@components/Tabs";
import { Eye } from "lucide-react";
import * as React from "react";

type Props = {
  disabled?: boolean;
};

export const InspectionTabTrigger = ({ disabled = false }: Props) => {
  return (
    <TabsTrigger value={"inspection"} disabled={disabled}>
      <Eye size={16} />
      Inspection
    </TabsTrigger>
  );
};
