import * as React from "react";
import { useMemo, useState } from "react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { SelectDropdown, SelectOption } from "@components/select/SelectDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import Button from "@components/Button";
import { FilePenIcon, MoreVertical, PencilLineIcon, PlusCircle, Trash2 } from "lucide-react";

type Draft = {
  id: string;
  name: string;
};

export const DraftModeTitle = () => {
  const { isDraft } = useDraftMode();

  // TODO: replace with actual drafts from API
  const [drafts, setDrafts] = useState<Draft[]>([
    { id: "1", name: "Untitled Draft" },
  ]);
  const [selectedDraft, setSelectedDraft] = useState("1");

  const options: SelectOption[] = useMemo(() => {
    const draftOptions: SelectOption[] = drafts.map((d) => ({
      value: d.id,
      label: d.name,
      icon: ({ size }: { size?: number }) => <FilePenIcon size={size} />,
    }));
    draftOptions.push({
      value: "__create_new__",
      label: "Create New Draft",
      icon: ({ size }: { size?: number }) => <PlusCircle size={size} />,
    });
    return draftOptions;
  }, [drafts]);

  const handleChange = (value: string) => {
    if (value === "__create_new__") {
      const newDraft: Draft = {
        id: String(Date.now()),
        name: `Untitled Draft ${drafts.length + 1}`,
      };
      setDrafts((prev) => [...prev, newDraft]);
      setSelectedDraft(newDraft.id);
      return;
    }
    setSelectedDraft(value);
  };

  const handleRename = () => {
    // TODO: implement rename
  };

  const handleDelete = () => {
    // TODO: implement delete
  };

  if (!isDraft) return null;

  return (
    <div className={"flex items-center gap-2"}>
      <SelectDropdown
        value={selectedDraft}
        onChange={handleChange}
        options={options}
        variant={"secondary"}
        size={"xs"}
        className={"!bg-nb-gray-930 min-w-[180px] h-[40px]"}
        popoverWidth={280}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"!px-0 !bg-nb-gray-930 h-[40px] !w-[40px] !min-w-[40px]"}
          >
            <MoreVertical size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
          <DropdownMenuItem onClick={handleRename}>
            <div className={"flex gap-3 items-center"}>
              <PencilLineIcon size={14} className={"shrink-0"} />
              Rename
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} variant={"danger"}>
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
