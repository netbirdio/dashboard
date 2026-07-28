import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import { useNetcodeTimeline } from "@/modules/control-center/netcode/NetcodeTimelineContext";

// Depth cue for time travel: the canvas sinks behind a cool vignette with the
// version's date set large in the corner, so a historical view can never be
// mistaken for the live one. Purely decorative and pointer-transparent —
// interaction gating lives on the ReactFlow props.
export const TimeTravelOverlay = () => {
  const { isTimeTravel, currentCommit } = useNetcodeTimeline();

  return (
    <AnimatePresence>
      {isTimeTravel && (
        <motion.div
          key={"time-travel-overlay"}
          className={"pointer-events-none absolute inset-0 z-[5]"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className={"cc-time-vignette absolute inset-0"} />

          {/* Frame lines that read as the edges of a receding stack. */}
          <div
            className={
              "absolute inset-x-6 top-3 h-px bg-gradient-to-r from-transparent via-sky-300/25 to-transparent"
            }
          />
          <div
            className={
              "absolute inset-x-16 top-6 h-px bg-gradient-to-r from-transparent via-sky-300/15 to-transparent"
            }
          />

          <motion.div
            className={"absolute left-8 top-8 select-none"}
            initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div
              className={
                "text-[0.62rem] font-medium uppercase tracking-[0.22em] text-sky-300/70"
              }
            >
              Viewing past version
            </div>
            <div
              className={
                "mt-1 text-3xl font-light leading-none tracking-tight text-white/85"
              }
            >
              {dayjs(currentCommit?.timestamp).format("MMM D, YYYY")}
            </div>
            <div className={"mt-1.5 text-xs text-sky-200/60"}>
              {dayjs(currentCommit?.timestamp).format("HH:mm")} · read-only
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
