import Badge from "@components/Badge";
import { NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  single: boolean;
};
export default function ResourceTypeCell({ single }: Props) {
  const t = useTranslations();
  return (
    <div className={"inline-flex"}>
      {single ? (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <WorkflowIcon size={14} />{" " + t("networks.singleIP")}
        </Badge>
      ) : (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <NetworkIcon size={14} />{" " + t("networks.ipRange")}
        </Badge>
      )}
    </div>
  );
}
