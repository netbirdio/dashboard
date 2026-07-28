import * as React from "react";
import { createContext, useContext, useMemo, useState } from "react";
import {
  DownloadIcon,
  HistoryIcon,
  MoreVertical,
  UploadIcon,
} from "lucide-react";
import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { ImportConfigModal } from "@/modules/control-center/netcode/ImportConfigModal";
import { ExportConfigModal } from "@/modules/control-center/netcode/ExportConfigModal";
import { NetcodeHistoryModal } from "@/modules/control-center/netcode/NetcodeHistoryModal";
import { StagedChangesetModal } from "@/modules/control-center/netcode/StagedChangesetModal";

// Configuration-as-code entry point: history, rollback and file import/export
// are account-level, so this is reachable in live mode as well as while
// drafting (the draft menu renders it inline next to its own items).

type Props = {
  /** Extra items rendered above the shared ones (draft rename/delete). */
  leadingItems?: React.ReactNode;
  className?: string;
};

// Staged changesets (file imports, rollbacks) are reviewed in a modal that must
// be reachable from anywhere on the canvas — the timeline stages rollbacks too.
type StagingContextType = {
  setStagedChangesetId: (id: string | null) => void;
};

const StagingContext = createContext<StagingContextType>({
  setStagedChangesetId: () => {},
});

export const useNetcodeStaging = () => useContext(StagingContext);

export function NetcodeStagingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stagedChangesetId, setStagedChangesetId] = useState<string | null>(
    null,
  );
  const value = useMemo(() => ({ setStagedChangesetId }), []);

  return (
    <StagingContext.Provider value={value}>
      {children}
      <StagedChangesetModal
        changesetId={stagedChangesetId}
        onOpenChange={(open) => !open && setStagedChangesetId(null)}
      />
    </StagingContext.Provider>
  );
}

export const NetcodeMenu = ({ leadingItems, className }: Props) => {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { setStagedChangesetId } = useNetcodeStaging();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={
              className ??
              "!px-0 !bg-nb-gray-930 h-[40px] !w-[40px] !min-w-[40px]"
            }
            data-testid={"cc-netcode-menu"}
          >
            <MoreVertical size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[190px]">
          {leadingItems}
          <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
            <div className={"flex gap-3 items-center"}>
              <HistoryIcon size={14} className={"shrink-0"} />
              History & Rollback
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <div className={"flex gap-3 items-center"}>
              <UploadIcon size={14} className={"shrink-0"} />
              Import from file
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportOpen(true)}>
            <div className={"flex gap-3 items-center"}>
              <DownloadIcon size={14} className={"shrink-0"} />
              Export to file
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportConfigModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={setStagedChangesetId}
      />
      <ExportConfigModal open={exportOpen} onOpenChange={setExportOpen} />
      <NetcodeHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRollbackStaged={setStagedChangesetId}
        onOpenStaged={setStagedChangesetId}
      />
    </>
  );
};
