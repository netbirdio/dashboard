import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { useRouter } from "next/navigation";
import React from "react";
import CircleIcon from "@/assets/icons/CircleIcon";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";

type Props = {
  active: boolean;
  group: Group;
};
export default function GroupsNameCell({ active, group }: Readonly<Props>) {
  const t = useTranslations();
  const router = useRouter();
  return (
    <div className={""}>
      <div
        className={
          "inline-flex items-center justify-start text-neutral-300 gap-2.5 py-2 px-3 pr-4 hover:bg-nb-gray-800/60 cursor-pointer rounded-md"
        }
        onClick={() => router.push("/group?id=" + group.id)}
      >
        <div className={"flex items-center justify-center h-full"}>
          <GroupBadgeIcon id={group?.id} issued={group?.issued} />
        </div>

        <div
          className={"flex flex-col min-w-0 cursor-pointer"}
          aria-label={t("groups.viewGroupDetails", { name: group.name })}
        >
          <div className={"font-medium flex gap-2 items-center justify-center"}>
            <TextWithTooltip text={group?.name} maxChars={50} />
          </div>
        </div>
        <CircleIcon
          size={8}
          active={active}
          inactiveDot={"gray"}
          className={"shrink-0"}
        />
      </div>
    </div>
  );
}
