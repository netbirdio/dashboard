import Badge from "@components/Badge";
import { IconRepeat } from "@tabler/icons-react";
import { Repeat1 } from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  reusable: boolean;
};
export default function SetupKeyTypeCell({ reusable }: Readonly<Props>) {
  const t = useTranslations();
  return (
    <div className={"flex"}>
      <Badge className={"text-xs"} variant={"gray"}>
        {reusable ? (
          <>
            <IconRepeat size={14} className={"text-green-400"} />{" " + t("setupKeys.reusable")}
          </>
        ) : (
          <>
            <Repeat1 size={14} />{" " + t("setupKeys.oneOff")}
          </>
        )}
      </Badge>
    </div>
  );
}
