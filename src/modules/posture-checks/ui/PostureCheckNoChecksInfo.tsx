import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import { IconCirclePlus } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { FolderSearch } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";

export function PostureCheckNoChecksInfo({
  onAddClick,
  onBrowseClick,
}: {
  onAddClick: () => void;
  onBrowseClick: () => void;
}) {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const { data: postureChecks } =
    useFetchApi<PostureCheck[]>("/posture-checks");

  return (
    <div>
      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          {t("postureChecks.noChecksTitle")}
        </h2>
        <Paragraph className={cn("text-sm text-center max-w-md mt-1")}>
          {t("postureChecks.emptyDescription")}
        </Paragraph>
      </div>
      <div className={"flex items-center justify-center gap-4 mt-5"}>
        <Button
          variant={"secondary"}
          size={"xs"}
          disabled={
            postureChecks?.length == 0 ||
            !permission.policies.create ||
            !permission.policies.update
          }
          onClick={onBrowseClick}
        >
          <FolderSearch size={14} />
          {t("postureChecks.browseChecks")}
        </Button>
        <Button
          variant={"primary"}
          size={"xs"}
          onClick={onAddClick}
          disabled={!permission.policies.create || !permission.policies.update}
        >
          <IconCirclePlus size={14} />
          {t("postureChecks.newButton")}
        </Button>
      </div>
    </div>
  );
}
