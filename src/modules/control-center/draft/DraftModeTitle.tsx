import * as React from "react";
import { useMemo, useState } from "react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";
import { useNetcodeDraft } from "@/modules/control-center/netcode/NetcodeDraftContext";
import { DraftNameModal } from "@/modules/control-center/draft/DraftNameModal";
import { SelectDropdown, SelectOption } from "@components/select/SelectDropdown";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@components/DropdownMenu";
import Button from "@components/Button";
import { useDialog } from "@/contexts/DialogProvider";
import { FilePenIcon, PencilLineIcon, PlusCircle, Trash2 } from "lucide-react";
import { NetcodeMenu } from "@/modules/control-center/netcode/NetcodeMenu";

const LOCAL_DRAFT = "__local__";
const CREATE_NEW = "__create_new__";

export const DraftModeTitle = () => {
  const { isDraft } = useDraftMode();
  const { changeCount } = useDraftChangeset();
  const { startNewDraft } = useDiscardDraft();
  const {
    drafts,
    activeDraft,
    draftName,
    setDraftName,
    saveDraft,
    openDraft,
    deleteDraft,
    clearActiveDraft,
  } = useNetcodeDraft();
  const { confirm } = useDialog();

  const [renameModalOpen, setRenameModalOpen] = useState(false);

  const options: SelectOption[] = useMemo(() => {
    const draftOptions: SelectOption[] = drafts.map((d) => ({
      value: d.id,
      label: d.name || "Untitled Draft",
      icon: ({ size }: { size?: number }) => <FilePenIcon size={size} />,
    }));
    if (!activeDraft) {
      draftOptions.unshift({
        value: LOCAL_DRAFT,
        label: draftName,
        icon: ({ size }: { size?: number }) => <FilePenIcon size={size} />,
      });
    }
    draftOptions.push({
      value: CREATE_NEW,
      label: "Create New Draft",
      icon: ({ size }: { size?: number }) => <PlusCircle size={size} />,
    });
    return draftOptions;
  }, [drafts, activeDraft, draftName]);

  const confirmSwitch = async () => {
    if (changeCount === 0) return true;
    return confirm({
      title: "Switch drafts?",
      description:
        "Unsaved changes of the current draft will be lost. Save the draft first to keep them.",
      confirmText: "Switch",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
    });
  };

  const handleChange = async (value: string) => {
    if (value === LOCAL_DRAFT || value === activeDraft?.id) return;
    if (value === CREATE_NEW) {
      // New drafts start unnamed — the name is asked on first save.
      if (!(await startNewDraft())) return;
      clearActiveDraft();
      return;
    }
    if (!(await confirmSwitch())) return;
    void openDraft(value);
  };

  const handleRename = (name: string) => {
    setDraftName(name);
    if (activeDraft) void saveDraft(name);
  };

  const handleDelete = async () => {
    if (!activeDraft) return;
    const choice = await confirm({
      title: "Delete draft?",
      description: `The draft "${activeDraft.name}" and its saved changes will be removed.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;
    deleteDraft(activeDraft.id);
  };

  if (!isDraft) return null;

  return (
    <div className={"flex items-center gap-2"}>
      <SelectDropdown
        value={activeDraft?.id ?? LOCAL_DRAFT}
        onChange={(v: string) => void handleChange(v)}
        options={options}
        variant={"secondary"}
        size={"xs"}
        className={"!bg-nb-gray-930 min-w-[180px] h-[40px]"}
        popoverWidth={280}
      />
      <NetcodeMenu
        leadingItems={
          <>
            <DropdownMenuItem onClick={() => setRenameModalOpen(true)}>
              <div className={"flex gap-3 items-center"}>
                <PencilLineIcon size={14} className={"shrink-0"} />
                Rename draft
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void handleDelete()}
              variant={"danger"}
              disabled={!activeDraft}
            >
              <div className={"flex gap-3 items-center"}>
                <Trash2 size={14} className={"shrink-0"} />
                Delete draft
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        }
      />

      <DraftNameModal
        open={renameModalOpen}
        onOpenChange={setRenameModalOpen}
        initialName={draftName}
        title={"Rename Draft"}
        onSuccess={handleRename}
      />

    </div>
  );
};
