import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import {
  AlertCircleIcon,
  CloudUploadIcon,
  GitPullRequestArrowIcon,
  Trash2,
} from "lucide-react";
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
import { NetCodeChangeset, NetCodeOperation } from "@/interfaces/NetCode";
import { DiffViewer } from "@/modules/control-center/netcode/DiffViewer";
import { useNetcodeApi } from "@/modules/control-center/netcode/useNetcodeApi";

// Reviews a changeset that did NOT come from the canvas — a file import, a
// staged rollback, or one created outside the dashboard. Those carry no draft
// attachment, so they cannot be edited on the canvas; they can only be
// inspected and deployed.

type Props = {
  changesetId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeployed?: () => void;
};

const OP_TONES: Record<string, string> = {
  create: "text-green-400",
  modify: "text-orange-400",
  delete: "text-red-400",
};

export const StagedChangesetModal = ({
  changesetId,
  onOpenChange,
  onDeployed,
}: Props) => {
  const { getChangeset, getChangesetDiff, commitChangeset, deleteChangeset } =
    useNetcodeApi();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();

  const [changeset, setChangeset] = useState<NetCodeChangeset | null>(null);
  const [diff, setDiff] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!changesetId) {
      setChangeset(null);
      setDiff("");
      setError(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      getChangeset(changesetId),
      getChangesetDiff(changesetId).catch(() => null),
    ])
      .then(([loaded, diffResult]) => {
        if (cancelled) return;
        setChangeset(loaded);
        setDiff(diffResult?.diff ?? loaded.diff_data ?? "");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            (err as { message?: string })?.message ??
              "Failed to load the changeset.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changesetId]);

  const operations: NetCodeOperation[] = useMemo(
    () => changeset?.operations ?? [],
    [changeset],
  );

  const validationErrors = useMemo(
    () =>
      (changeset?.validation_errors ?? []).filter(
        (e) => e.severity === "error",
      ),
    [changeset],
  );

  const validationWarnings = useMemo(
    () =>
      (changeset?.validation_errors ?? []).filter(
        (e) => e.severity === "warning",
      ),
    [changeset],
  );

  const handleDeploy = useCallback(async () => {
    if (!changeset) return;
    const choice = await confirm({
      title: "Deploy this changeset?",
      description: `${operations.length} operation(s) will be applied to your network.`,
      confirmText: "Deploy",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;

    setBusy(true);
    try {
      await commitChangeset(
        changeset.id,
        `Deploy changeset "${changeset.name}"`,
      );
      await Promise.all([
        mutate("/groups"),
        mutate("/policies"),
        mutate("/networks"),
        mutate("/networks/resources"),
      ]).catch(() => {});
      notify({
        title: "Deploy",
        description: "The changeset was applied to your network.",
      });
      onDeployed?.();
      onOpenChange(false);
    } catch (err) {
      notify({
        title: "Deploy",
        description:
          (err as { message?: string })?.message ??
          "Applying the changeset failed. It stays pending so you can retry.",
        icon: <AlertCircleIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
    } finally {
      setBusy(false);
    }
  }, [
    changeset,
    confirm,
    operations.length,
    commitChangeset,
    mutate,
    onDeployed,
    onOpenChange,
  ]);

  const handleDiscard = useCallback(async () => {
    if (!changeset) return;
    const choice = await confirm({
      title: "Discard this changeset?",
      description: "The staged changes are deleted. This cannot be undone.",
      confirmText: "Discard",
      cancelText: "Cancel",
      type: "danger",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;

    setBusy(true);
    try {
      await deleteChangeset(changeset.id);
      onOpenChange(false);
    } catch (err) {
      notify({
        title: "Discard Changeset",
        description:
          (err as { message?: string })?.message ?? "Failed to discard.",
        icon: <AlertCircleIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
    } finally {
      setBusy(false);
    }
  }, [changeset, confirm, deleteChangeset, onOpenChange]);

  const isInvalid = changeset?.validation_status === "invalid";

  return (
    <Modal open={!!changesetId} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-4xl"}>
        <ModalHeader
          icon={
            <GitPullRequestArrowIcon size={18} className={"text-netbird"} />
          }
          title={changeset?.name || "Staged Changeset"}
          description={
            error ??
            (changeset
              ? `${operations.length} operation(s) will be applied to your network.`
              : "Loading changeset...")
          }
        />
        <div className={"px-8 pt-2 pb-8 flex flex-col gap-3"}>
          {validationErrors.length > 0 && (
            <div
              className={
                "rounded-md border border-red-500/25 bg-red-900/20 px-3.5 py-2.5 flex flex-col gap-1.5"
              }
            >
              {validationErrors.slice(0, 6).map((entry, index) => (
                <div
                  key={index}
                  className={"flex items-start gap-2 text-xs text-red-300"}
                >
                  <AlertCircleIcon size={13} className={"shrink-0 mt-[1px]"} />
                  <span className={"font-mono text-[0.65rem]"}>
                    {entry.path}
                  </span>
                  {entry.message}
                </div>
              ))}
            </div>
          )}

          {validationWarnings.length > 0 && (
            <div
              className={
                "rounded-md border border-amber-500/25 bg-amber-900/20 px-3.5 py-2.5 flex flex-col gap-1.5"
              }
            >
              {validationWarnings.slice(0, 6).map((entry, index) => (
                <div
                  key={index}
                  className={"flex items-start gap-2 text-xs text-amber-300"}
                >
                  <AlertCircleIcon size={13} className={"shrink-0 mt-[1px]"} />
                  {entry.message}
                </div>
              ))}
            </div>
          )}

          {operations.length > 0 && (
            <div
              className={
                "rounded-md border border-nb-gray-910 bg-nb-gray-930/40 overflow-hidden"
              }
            >
              <ScrollArea className={"max-h-[180px]"}>
                <div
                  className={"p-1.5 w-0 min-w-full flex flex-col gap-0.5"}
                >
                  {operations.map((op, index) => (
                    <div
                      key={index}
                      className={
                        "flex items-center gap-2 px-2 py-1 text-xs text-nb-gray-300"
                      }
                    >
                      <span
                        className={cn(
                          "font-medium w-12 shrink-0",
                          OP_TONES[op.type] ?? "text-nb-gray-400",
                        )}
                      >
                        {op.type}
                      </span>
                      <span className={"text-nb-gray-400 w-32 shrink-0"}>
                        {op.resource_type}
                      </span>
                      <span className={"truncate"}>
                        {op.resource_name || op.resource_id}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DiffViewer
            diff={diff}
            emptyMessage={
              "No configuration changes — this changeset matches the live account."
            }
          />
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <Button
              variant={"secondary"}
              disabled={busy || !changeset}
              onClick={() => void handleDiscard()}
            >
              <Trash2 size={16} />
              Discard
            </Button>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} disabled={busy}>
                Close
              </Button>
            </ModalClose>
            <Button
              variant={"primary"}
              disabled={busy || !changeset || isInvalid}
              onClick={() => void handleDeploy()}
            >
              <CloudUploadIcon size={16} />
              {busy ? "Deploying..." : "Deploy"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
