import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  DownloadIcon,
  GitCommitVerticalIcon,
  GitCompareIcon,
  GitPullRequestArrowIcon,
  HistoryIcon,
  RotateCcwIcon,
} from "lucide-react";
import dayjs from "dayjs";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { ScrollArea } from "@components/ScrollArea";
import { notify } from "@components/Notification";
import { useDialog } from "@/contexts/DialogProvider";
import { cn } from "@utils/helpers";
import useFetchApi from "@utils/api";
import {
  NetCodeChangesetListResponse,
  NetCodeCommit,
} from "@/interfaces/NetCode";
import {
  DiffStats,
  DiffViewer,
} from "@/modules/control-center/netcode/DiffViewer";
import {
  downloadConfigFile,
  useNetcodeApi,
} from "@/modules/control-center/netcode/useNetcodeApi";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the changeset id created by a rollback. */
  onRollbackStaged?: (changesetId: string) => void;
  /** Opens a staged (non-canvas) changeset for review. */
  onOpenStaged?: (changesetId: string) => void;
};

const CURRENT = "current";

export const NetcodeHistoryModal = ({
  open,
  onOpenChange,
  onRollbackStaged,
  onOpenStaged,
}: Props) => {
  const { listCommits, getCommit, diffRefs, exportCommit, importConfig } =
    useNetcodeApi();
  // Pending changesets without a draft attachment — file imports, staged
  // rollbacks, or changesets created outside the dashboard.
  const { data: changesetList } = useFetchApi<NetCodeChangesetListResponse>(
    "/netcode/changesets",
    true,
    false,
    open,
  );
  const staged = useMemo(
    () =>
      (changesetList?.changesets ?? []).filter(
        (c) => c.status !== "committed" && !c.metadata?.attachment,
      ),
    [changesetList],
  );
  const { confirm } = useDialog();

  const [commits, setCommits] = useState<NetCodeCommit[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [compareFrom, setCompareFrom] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ label: string; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  // Fetched only while the modal is open — the canvas must never pay for it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listCommits(50, 0)
      .then((res) => {
        if (!cancelled) setCommits(res.commits ?? []);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            (error as { message?: string })?.message ??
              "Failed to load the commit history.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) return;
    setSelected(null);
    setCompareFrom(null);
    setDiff(null);
    setLoadError(null);
  }, [open]);

  const shortId = (id: string) => id.slice(0, 8);

  const showCommitDiff = useCallback(
    async (commit: NetCodeCommit) => {
      setSelected(commit.id);
      setBusy(true);
      try {
        // The commit carries its own diff vs its parent; fall back to a
        // computed diff for commits stored before that was recorded.
        const full = commit.diff_data
          ? commit
          : await getCommit(commit.id).catch(() => commit);
        if (full.diff_data) {
          setDiff({ label: `Commit ${shortId(commit.id)}`, text: full.diff_data });
          return;
        }
        const result = await diffRefs(commit.parent_id || CURRENT, commit.id);
        setDiff({ label: `Commit ${shortId(commit.id)}`, text: result.diff });
      } catch (error) {
        notify({
          title: "Commit History",
          description:
            (error as { message?: string })?.message ??
            "Failed to load the commit diff.",
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
      } finally {
        setBusy(false);
      }
    },
    [getCommit, diffRefs],
  );

  const compare = useCallback(
    async (from: string, to: string) => {
      setBusy(true);
      try {
        const result = await diffRefs(from, to);
        setDiff({
          label: `${from === CURRENT ? "Live" : shortId(from)} → ${
            to === CURRENT ? "Live" : shortId(to)
          }`,
          text: result.diff,
        });
      } catch (error) {
        notify({
          title: "Compare",
          description:
            (error as { message?: string })?.message ??
            "Failed to compute the diff.",
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
      } finally {
        setBusy(false);
      }
    },
    [diffRefs],
  );

  const handleExport = useCallback(
    async (commit: NetCodeCommit) => {
      setBusy(true);
      try {
        const content = await exportCommit(commit.id);
        downloadConfigFile(
          content,
          `netbird-configuration-${shortId(commit.id)}.yaml`,
        );
      } catch (error) {
        notify({
          title: "Export Commit",
          description:
            (error as { message?: string })?.message ?? "The export failed.",
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
      } finally {
        setBusy(false);
      }
    },
    [exportCommit],
  );

  // Rollback stages the commit's configuration as a new changeset: it is
  // reviewed and deployed like any other change, never applied silently.
  const handleRollback = useCallback(
    async (commit: NetCodeCommit) => {
      const choice = await confirm({
        title: "Roll back to this commit?",
        description:
          "The configuration at this commit is staged as a new changeset. Review its diff and deploy it to apply the rollback — nothing changes until you do.",
        confirmText: "Stage rollback",
        cancelText: "Cancel",
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;

      setBusy(true);
      try {
        const content = await exportCommit(commit.id);
        const result = await importConfig(
          content,
          `Rollback to ${shortId(commit.id)}`,
          commit.message,
        );
        notify({
          title: "Rollback",
          description:
            "The rollback was staged as a changeset. Review its diff, then deploy it to apply.",
        });
        onRollbackStaged?.(result.changesetId);
        onOpenChange(false);
      } catch (error) {
        notify({
          title: "Rollback",
          description:
            (error as { message?: string })?.message ??
            "Failed to stage the rollback.",
          icon: <AlertCircleIcon size={16} />,
          backgroundColor: "bg-red-500",
        });
      } finally {
        setBusy(false);
      }
    },
    [confirm, exportCommit, importConfig, onRollbackStaged, onOpenChange],
  );

  const description = useMemo(() => {
    if (loadError) return loadError;
    if (commits === null) return "Loading commit history...";
    if (commits.length === 0) {
      return "No commits yet — deploying a draft records the first one.";
    }
    return `${commits.length} commit${commits.length !== 1 ? "s" : ""}. Select two commits to compare them.`;
  }, [commits, loadError]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-4xl"}>
        <ModalHeader
          icon={<HistoryIcon size={18} className={"text-netbird"} />}
          title={"Configuration History"}
          description={description}
        />
        <div className={"px-8 pt-2 pb-8 flex flex-col gap-3"}>
          {compareFrom && (
            <div
              className={
                "flex items-center gap-2 rounded-md border border-netbird/25 bg-netbird/5 px-3.5 py-2 text-xs text-nb-gray-200"
              }
            >
              Comparing from
              <span className={"font-mono"}>{shortId(compareFrom)}</span>
              — press <span className={"font-medium"}>Compare to</span> on
              another commit, or
              <button
                className={"text-netbird hover:underline"}
                onClick={() => void compare(compareFrom, CURRENT)}
              >
                compare with live
              </button>
              <button
                className={"ml-auto text-nb-gray-400 hover:text-nb-gray-200"}
                onClick={() => setCompareFrom(null)}
              >
                Clear
              </button>
            </div>
          )}

          {staged.length > 0 && onOpenStaged && (
            <div
              className={
                "rounded-md border border-nb-gray-910 bg-nb-gray-930/40 overflow-hidden"
              }
            >
              <div
                className={
                  "px-3.5 py-2 border-b border-nb-gray-910 text-xs font-medium text-nb-gray-200"
                }
              >
                Staged changesets
              </div>
              <div className={"p-1.5 w-0 min-w-full"}>
                {staged.map((changeset) => (
                  <button
                    key={changeset.id}
                    className={
                      "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs hover:bg-nb-gray-920/60 text-left"
                    }
                    onClick={() => {
                      onOpenStaged(changeset.id);
                      onOpenChange(false);
                    }}
                  >
                    <GitPullRequestArrowIcon
                      size={13}
                      className={"shrink-0 text-nb-gray-400"}
                    />
                    <span className={"truncate text-nb-gray-200"}>
                      {changeset.name || "Untitled changeset"}
                    </span>
                    <span
                      className={cn(
                        "ml-auto shrink-0",
                        changeset.validation_status === "invalid"
                          ? "text-red-400"
                          : "text-green-400",
                      )}
                    >
                      {changeset.validation_status}
                    </span>
                    <span className={"shrink-0 text-nb-gray-500"}>
                      {dayjs(changeset.updated_at).format("YYYY-MM-DD HH:mm")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={
              "rounded-md border border-nb-gray-910 bg-nb-gray-930/40 overflow-hidden"
            }
          >
            <ScrollArea className={"max-h-[260px]"}>
              <div className={"p-1.5 w-0 min-w-full"}>
                {(commits ?? []).map((commit) => (
                  <div
                    key={commit.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs",
                      selected === commit.id
                        ? "bg-nb-gray-920"
                        : "hover:bg-nb-gray-920/60",
                    )}
                  >
                    <GitCommitVerticalIcon
                      size={14}
                      className={"shrink-0 text-nb-gray-400"}
                    />
                    <span className={"font-mono text-nb-gray-400 shrink-0"}>
                      {shortId(commit.id)}
                    </span>
                    <button
                      className={
                        "truncate text-left text-nb-gray-200 hover:text-white"
                      }
                      title={"Show this commit's changes"}
                      onClick={() => void showCommitDiff(commit)}
                    >
                      {commit.message}
                    </button>
                    {commit.stats && (
                      <DiffStats
                        additions={commit.stats.insertions}
                        deletions={commit.stats.deletions}
                        className={"shrink-0 ml-auto"}
                      />
                    )}
                    <span className={"shrink-0 text-nb-gray-500"}>
                      {dayjs(commit.timestamp).format("YYYY-MM-DD HH:mm")}
                    </span>
                    <div
                      className={"shrink-0 flex items-center gap-1.5"}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant={compareFrom === commit.id ? "primary" : "secondary"}
                        size={"xs"}
                        className={"!h-6 !px-2 !text-[11px]"}
                        disabled={busy}
                        onClick={() => {
                          if (compareFrom && compareFrom !== commit.id) {
                            void compare(compareFrom, commit.id);
                            setCompareFrom(null);
                            return;
                          }
                          setCompareFrom(
                            compareFrom === commit.id ? null : commit.id,
                          );
                        }}
                      >
                        <GitCompareIcon size={11} />
                        {compareFrom && compareFrom !== commit.id
                          ? "Compare to"
                          : "Compare"}
                      </Button>
                      <Button
                        variant={"secondary"}
                        size={"xs"}
                        className={"!h-6 !px-2 !text-[11px]"}
                        disabled={busy}
                        onClick={() => void handleExport(commit)}
                      >
                        <DownloadIcon size={11} />
                        Download
                      </Button>
                      <Button
                        variant={"secondary"}
                        size={"xs"}
                        className={
                          "!h-6 !px-2 !text-[11px] !text-amber-400 hover:!text-amber-300"
                        }
                        disabled={busy}
                        onClick={() => void handleRollback(commit)}
                      >
                        <RotateCcwIcon size={11} />
                        Roll back
                      </Button>
                    </div>
                  </div>
                ))}
                {commits?.length === 0 && (
                  <div
                    className={"text-sm text-nb-gray-400 text-center py-8"}
                  >
                    No commits yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {diff && (
            <DiffViewer
              diff={diff.text}
              title={diff.label}
              emptyMessage={"No differences between these two versions."}
            />
          )}
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Close</Button>
            </ModalClose>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
