import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { DataTableMultiSelectPopup } from "@components/table/DataTableMultiSelectPopup";
import { ErrorResponse, useApiCall } from "@utils/api";
import { FolderGit2, Trash2 } from "lucide-react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";
import { GroupUsage } from "@/modules/groups/useGroupsUsage";

type Props = {
  selectedGroups?: GroupUsage[];
  onCanceled?: () => void;
};

export const GroupsMultiSelect = ({
  selectedGroups = [],
  onCanceled,
}: Readonly<Props>) => {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const { deleteGroupDropdownOption } = useGroups();
  const { permission } = usePermissions();
  const groupCall = useApiCall<Group>("/groups", true);
  const groupCount = selectedGroups.length;

  const deleteAllGroups = async () => {
    if (!permission.groups.delete || groupCount === 0) return;

    const choice = await confirm({
      title: t("groups.deleteCountTitle", { count: groupCount }),
      description:
        groupCount > 1
          ? t("groups.deleteTheseDescription")
          : t("groups.deleteThisDescription"),
      confirmText: t("groups.deleteAll"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;

    // Take the batch and drop the selection now rather than when the requests
    // land, so a slow batch cannot wipe a selection the user made in the
    // meantime, and the popup acknowledges the confirmation immediately.
    const groupsToDelete = selectedGroups;
    onCanceled?.();

    // allSettled, not all: the in-use counts driving the checkboxes come from a
    // client-side snapshot, so the server can still reject an individual group.
    // The table has to refresh for the ones that did get deleted either way.
    const promise = Promise.allSettled(
      groupsToDelete.map((group) => groupCall.del({}, `/${group.id}`)),
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          deleteGroupDropdownOption(groupsToDelete[index].name);
        }
      });
      mutate("/groups");

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length === 0) return;

      const firstError = failures[0].reason as ErrorResponse | undefined;
      const failureMessage =
        firstError?.message ?? t("groups.somethingWentWrong");
      return Promise.reject({
        code: firstError?.code ?? 418,
        requestId: firstError?.requestId,
        message:
          failures.length === groupCount
            ? failureMessage
            : t("groups.deletePartialFailure", {
                failed: failures.length,
                total: groupCount,
                message: failureMessage,
              }),
      } satisfies ErrorResponse);
    });

    notify({
      title: t("groups.deleteGroupsTitle"),
      description:
        groupCount > 1
          ? t("groups.groupsDeletedDescription")
          : t("groups.groupDeletedDescription"),
      promise,
      loadingMessage:
        groupCount > 1
          ? t("groups.deletingSelectedGroups")
          : t("groups.deletingSelectedGroup"),
    });
  };

  return (
    <DataTableMultiSelectPopup
      selectedItems={selectedGroups}
      label={
        groupCount === 1
          ? t("groups.groupSelected")
          : t("groups.groupsSelected")
      }
      onCanceled={onCanceled}
      icon={<FolderGit2 size={16} />}
      rightSide={
        <FullTooltip content={<span className={"text-xs"}>{t("groups.deleteAll")}</span>}>
          <Button
            variant={"danger-outline"}
            size={"xs"}
            className={"!h-9 !w-9"}
            onClick={deleteAllGroups}
            disabled={!permission.groups.delete}
            aria-label={t("groups.deleteSelectedGroups")}
          >
            <Trash2 size={16} className={"shrink-0"} />
          </Button>
        </FullTooltip>
      }
    />
  );
};
