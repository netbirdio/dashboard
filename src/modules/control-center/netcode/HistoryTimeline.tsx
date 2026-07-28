import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import dayjs from "dayjs";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useDialog } from "@/contexts/DialogProvider";
import { cn } from "@utils/helpers";
import { NetCodeCommit } from "@/interfaces/NetCode";
import { DiffStats } from "@/modules/control-center/netcode/DiffViewer";
import {
  LIVE_INDEX,
  useNetcodeTimeline,
} from "@/modules/control-center/netcode/NetcodeTimelineContext";
import {
  downloadConfigFile,
  useNetcodeApi,
} from "@/modules/control-center/netcode/useNetcodeApi";
import { isInputFocused } from "@/modules/control-center/hooks/useControlCenterShortcuts";

type Props = {
  /** Opens the staged changeset a rollback creates. */
  onRollbackStaged?: (changesetId: string) => void;
};

const shortId = (id: string) => id.slice(0, 8);

const RAIL_WIDTH = 420;
const SPRING = { type: "spring" as const, stiffness: 520, damping: 40 };

// Stops on the rail: every commit oldest -> newest, then the live account. Each
// stop gets a rail offset derived from its timestamp, so long gaps between
// deploys read as long gaps in time (Time Machine's receding-days feeling)
// while still snapping to discrete versions.
type Stop = {
  index: number;
  commit: NetCodeCommit | null;
  offset: number;
};

export const HistoryTimeline = ({ onRollbackStaged }: Props) => {
  const {
    commits,
    index,
    selectIndex,
    currentCommit,
    close,
    isLoading,
    isTimeTravel,
  } = useNetcodeTimeline();
  const { exportCommit, importConfig } = useNetcodeApi();
  const { confirm } = useDialog();
  const [busy, setBusy] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const stops = useMemo<Stop[]>(() => {
    // commits arrive newest-first
    const ordered = [...commits].reverse();
    const times = ordered.map((c) => new Date(c.timestamp).getTime());
    const now = Date.now();
    const first = times.length > 0 ? times[0] : now;
    const span = Math.max(now - first, 1);

    const commitStops: Stop[] = ordered.map((commit, position) => ({
      // back to the newest-first index the context uses
      index: commits.length - 1 - position,
      commit,
      // 6% padding keeps the oldest tick off the rail's rounded end
      offset: 0.06 + (0.88 * (times[position] - first)) / span,
    }));

    return [...commitStops, { index: LIVE_INDEX, commit: null, offset: 1 }];
  }, [commits]);

  const activeStopIndex = stops.findIndex((stop) => stop.index === index);
  const activeStop = stops[activeStopIndex] ?? stops[stops.length - 1];

  const step = useCallback(
    (delta: number) => {
      const next = Math.max(
        0,
        Math.min(stops.length - 1, activeStopIndex + delta),
      );
      selectIndex(stops[next].index);
    },
    [activeStopIndex, stops, selectIndex],
  );

  // Nearest-stop snapping for rail clicks and playhead drags.
  const selectNearestTo = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail || stops.length === 0) return;
      const rect = rail.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      let nearest = stops[0];
      for (const stop of stops) {
        if (
          Math.abs(stop.offset - ratio) < Math.abs(nearest.offset - ratio)
        ) {
          nearest = stop;
        }
      }
      if (nearest.index !== index) selectIndex(nearest.index);
    },
    [stops, index, selectIndex],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => selectNearestTo(event.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, selectNearestTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, close]);

  const handleDownload = useCallback(async () => {
    if (!currentCommit) return;
    setBusy(true);
    try {
      const content = await exportCommit(currentCommit.id);
      downloadConfigFile(
        content,
        `netbird-configuration-${shortId(currentCommit.id)}.yaml`,
      );
    } catch (error) {
      notify({
        title: "Export",
        description:
          (error as { message?: string })?.message ?? "The export failed.",
        icon: <XIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
    } finally {
      setBusy(false);
    }
  }, [currentCommit, exportCommit]);

  const handleRollback = useCallback(async () => {
    if (!currentCommit) return;
    const choice = await confirm({
      title: "Restore this version?",
      description:
        "This version is staged as a changeset. Review its diff and deploy it to apply the restore — nothing changes until you do.",
      confirmText: "Stage restore",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;

    setBusy(true);
    try {
      const content = await exportCommit(currentCommit.id);
      const result = await importConfig(
        content,
        `Restore ${shortId(currentCommit.id)}`,
        currentCommit.message,
      );
      close();
      onRollbackStaged?.(result.changesetId);
    } catch (error) {
      notify({
        title: "Restore",
        description:
          (error as { message?: string })?.message ??
          "Failed to stage the restore.",
        icon: <XIcon size={16} />,
        backgroundColor: "bg-red-500",
      });
    } finally {
      setBusy(false);
    }
  }, [currentCommit, exportCommit, importConfig, close, onRollbackStaged]);

  const dateLabel = isTimeTravel
    ? dayjs(currentCommit?.timestamp).format("MMM D, YYYY")
    : "Now";
  const timeLabel = isTimeTravel
    ? dayjs(currentCommit?.timestamp).format("HH:mm")
    : "Live configuration";

  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border border-white/10 bg-nb-gray-940/80 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      }
    >
      {/* Receding depth: cool nebula wash plus a slow starfield. */}
      <div
        className={
          "pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_50%_120%,rgba(56,96,190,0.28)_0%,transparent_60%)]"
        }
      />
      <div
        className={"cc-time-starfield pointer-events-none absolute inset-0 opacity-60"}
      />

      <div className={"relative flex items-stretch gap-4 px-4 py-3"}>
        {/* Date readout — the anchor the eye returns to while scrubbing. */}
        <div className={"flex w-[150px] shrink-0 flex-col justify-center"}>
          <AnimatePresence mode={"popLayout"} initial={false}>
            <motion.div
              key={dateLabel + timeLabel}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.18 }}
            >
              <div
                className={cn(
                  "text-[0.95rem] font-medium leading-none tracking-tight",
                  isTimeTravel ? "text-sky-200" : "text-green-300",
                )}
              >
                {dateLabel}
              </div>
              <div
                className={"mt-1 truncate text-[0.7rem] text-nb-gray-400"}
                title={timeLabel}
              >
                {timeLabel}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={"flex items-center gap-2"}>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"!h-7 !w-7 !min-w-0 !px-0 !bg-white/5"}
            disabled={activeStopIndex <= 0 || isLoading}
            onClick={() => step(-1)}
          >
            <ChevronLeftIcon size={14} />
          </Button>

          {/* The rail: click to jump, drag the playhead, ticks per version. */}
          <div
            ref={railRef}
            style={{ width: RAIL_WIDTH }}
            className={"relative h-12 cursor-pointer select-none"}
            onPointerDown={(event) => {
              setDragging(true);
              selectNearestTo(event.clientX);
            }}
          >
            <div
              className={
                "absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-500/15 via-indigo-400/25 to-emerald-400/40"
              }
            />

            {stops.map((stop, position) => {
              const isLive = stop.index === LIVE_INDEX;
              const isActive = stop.index === index;
              const isPast = position < activeStopIndex;
              return (
                <FullTooltip
                  key={isLive ? "live" : stop.commit?.id}
                  interactive={false}
                  content={
                    <span className={"text-xs"}>
                      {isLive
                        ? "Live configuration"
                        : `${stop.commit?.message} · ${dayjs(
                            stop.commit?.timestamp,
                          ).format("MMM D, HH:mm")}`}
                    </span>
                  }
                >
                  <motion.div
                    className={"absolute top-1/2 -translate-y-1/2"}
                    style={{ left: `${stop.offset * 100}%` }}
                    initial={{ opacity: 0, scaleY: 0.4 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: 0.02 * position, duration: 0.25 }}
                  >
                    <div
                      className={cn(
                        "-translate-x-1/2 rounded-full transition-all",
                        isLive
                          ? "h-3 w-3 border-2"
                          : isActive
                          ? "h-5 w-[3px]"
                          : "h-3 w-[2px]",
                        isLive
                          ? isActive
                            ? "border-emerald-300 bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]"
                            : "border-emerald-400/70 bg-nb-gray-940"
                          : isActive
                          ? "bg-white shadow-[0_0_14px_rgba(190,220,255,0.95)]"
                          : isPast
                          ? "bg-sky-300/45"
                          : "bg-white/25",
                      )}
                    />
                  </motion.div>
                </FullTooltip>
              );
            })}

            {/* Playhead — springs between stops, pulses while parked. */}
            <motion.div
              className={"pointer-events-none absolute top-0 h-full"}
              animate={{ left: `${activeStop.offset * 100}%` }}
              transition={SPRING}
            >
              <div
                className={cn(
                  "-translate-x-1/2",
                  !dragging && "cc-time-playhead",
                )}
              >
                <div
                  className={cn(
                    "h-12 w-[2px] rounded-full",
                    isTimeTravel
                      ? "bg-gradient-to-b from-transparent via-sky-200 to-transparent shadow-[0_0_18px_rgba(125,211,252,0.9)]"
                      : "bg-gradient-to-b from-transparent via-emerald-200 to-transparent shadow-[0_0_18px_rgba(110,231,183,0.9)]",
                  )}
                />
              </div>
            </motion.div>
          </div>

          <Button
            variant={"secondary"}
            size={"xs"}
            className={"!h-7 !w-7 !min-w-0 !px-0 !bg-white/5"}
            disabled={activeStopIndex >= stops.length - 1 || isLoading}
            onClick={() => step(1)}
          >
            <ChevronRightIcon size={14} />
          </Button>
        </div>

        {/* Version detail + actions */}
        <div
          className={"flex min-w-[240px] max-w-[300px] flex-1 items-center gap-2.5"}
        >
          <AnimatePresence mode={"wait"} initial={false}>
            <motion.div
              key={currentCommit?.id ?? "live"}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
              className={"flex min-w-0 flex-1 flex-col gap-1"}
            >
              {isTimeTravel && currentCommit ? (
                <>
                  <span
                    className={"truncate text-xs text-nb-gray-100"}
                    title={currentCommit.message}
                  >
                    {currentCommit.message}
                  </span>
                  <span
                    className={"flex items-center gap-2 text-[0.68rem] text-nb-gray-500"}
                  >
                    <span className={"font-mono"}>
                      {shortId(currentCommit.id)}
                    </span>
                    {currentCommit.author?.name && (
                      <span className={"truncate"}>
                        {currentCommit.author.name}
                      </span>
                    )}
                    {currentCommit.stats && (
                      <DiffStats
                        additions={currentCommit.stats.insertions}
                        deletions={currentCommit.stats.deletions}
                      />
                    )}
                  </span>
                </>
              ) : (
                <span className={"text-xs text-nb-gray-400"}>
                  {commits.length === 0
                    ? "No versions recorded yet — deploying a draft records the first."
                    : `${commits.length} version${
                        commits.length !== 1 ? "s" : ""
                      } · scrub to travel back`}
                </span>
              )}
            </motion.div>
          </AnimatePresence>

          {isLoading && (
            <span className={"shrink-0 text-[0.68rem] text-sky-300/80"}>
              loading…
            </span>
          )}
        </div>

        <div
          className={"flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-3"}
        >
          <FullTooltip
            interactive={false}
            content={<span className={"text-xs"}>Download this version</span>}
          >
            <Button
              variant={"secondary"}
              size={"xs"}
              className={"!h-7 !w-7 !min-w-0 !px-0 !bg-white/5"}
              disabled={!isTimeTravel || busy}
              onClick={() => void handleDownload()}
            >
              <DownloadIcon size={13} />
            </Button>
          </FullTooltip>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={cn(
              "!h-7 !px-2.5 !text-[11px] !bg-white/5",
              isTimeTravel && "!text-amber-300 hover:!text-amber-200",
            )}
            disabled={!isTimeTravel || busy}
            onClick={() => void handleRollback()}
          >
            <RotateCcwIcon size={12} />
            Restore
          </Button>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"!h-7 !w-7 !min-w-0 !px-0 !bg-white/5"}
            onClick={close}
          >
            <XIcon size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
