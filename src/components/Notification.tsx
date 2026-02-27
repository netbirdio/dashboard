import { IconCircleX } from "@tabler/icons-react";
import type { ErrorResponse } from "@utils/api";
import { cn } from "@utils/helpers";
import classNames from "classnames";
import { motion } from "framer-motion";
import { CheckIcon, Loader2, XIcon } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface NotifyProps<T> {
  title: string;
  description: string;
  promise?: Promise<T | ErrorResponse>;
  loadingTitle?: string;
  loadingMessage?: string;
  duration?: number;
  icon?: React.ReactNode;
  backgroundColor?: string;
  preventSuccessToast?: boolean;
  showOnlyError?: boolean;
  errorMessages?: ErrorResponse[];
}

interface NotificationProps<T> extends NotifyProps<T> {
  toastId: string | number;
}

export default function Notification<T>({
  title,
  description,
  icon,
  backgroundColor,
  toastId,
  promise,
  loadingTitle,
  loadingMessage,
  duration = 3500,
  preventSuccessToast = false,
  showOnlyError = false,
  errorMessages,
}: NotificationProps<T>) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!promise && !showOnlyError);
  const [readyToDismiss, setReadyToDismiss] = useState(!promise);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      toast.dismiss(toastId);
    }, Math.max(0, remainingRef.current));
  }, [toastId]);

  const pauseTimer = useCallback(() => {
    if (!timerRef.current || !startTimeRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (Date.now() - startTimeRef.current),
    );
  }, []);

  const notificationRef = useRef<HTMLDivElement>(null);

  // Watch for sonner's expanded state to pause/resume timer
  useEffect(() => {
    if (!readyToDismiss) return;

    const toastEl = notificationRef.current?.closest(
      "[data-sonner-toast]",
    ) as HTMLElement | null;
    if (!toastEl) {
      startTimer();
      return;
    }

    const observer = new MutationObserver(() => {
      const expanded = toastEl.getAttribute("data-expanded") === "true";
      if (expanded) {
        pauseTimer();
      } else {
        startTimer();
      }
    });

    observer.observe(toastEl, { attributes: true, attributeFilter: ["data-expanded"] });

    // Start immediately if not expanded
    const expanded = toastEl.getAttribute("data-expanded") === "true";
    if (!expanded) startTimer();

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [readyToDismiss, toastId, startTimer, pauseTimer]);

  useEffect(() => {
    // Run the promise
    if (promise) {
      promise
        .then(() => {
          setLoading(false);
          if (showOnlyError || preventSuccessToast) {
            toast.dismiss(toastId);
          } else {
            setReadyToDismiss(true);
          }
        })
        .catch((e) => {
          const err = e as ErrorResponse;
          let message = err.message || "Something went wrong...";
          message = message.charAt(0).toUpperCase() + message.slice(1);
          const code: number = err.code || 418;

          if (errorMessages) {
            const errorMessage = errorMessages.find(
              (error) => error.code === code,
            );
            if (errorMessage) {
              setError(errorMessage.message);
            }
          } else {
            setError(`Code ${code}: ${message}`);
          }

          setLoading(false);
          setReadyToDismiss(true);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={notificationRef}
      initial={{ y: -20 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      data-toast-notification
      className="w-[28rem] pb-2"
    >
      <div
        className={cn(
          "w-full justify-between bg-white dark:bg-nb-gray-940 shadow-lg rounded-md px-4 py-2.5 pointer-events-auto flex border dark:border-nb-gray-900",
        )}
      >
        <div className={"flex items-center gap-4"}>
          <div
            className={classNames(
              "h-8 w-8  shadow-sm text-white flex items-center justify-center rounded-md shrink-0",
              loading
                ? "bg-nb-gray-900"
                : error
                ? "bg-red-500"
                : backgroundColor || "bg-green-500",
            )}
          >
            {loading ? (
              <Loader2 size={14} className={"animate-spin"} />
            ) : error ? (
              <IconCircleX size={24} />
            ) : (
              icon || <CheckIcon size={14} />
            )}
          </div>
          <div className={"flex flex-col text-sm"}>
            <p>
              <span className={"font-semibold"}>
                {loading ? loadingTitle || title : title}
              </span>
            </p>
            <p className={"text-xs dark:text-nb-gray-300 text-gray-600 mt-0.5"}>
              {loading ? loadingMessage : error ? error : description}
            </p>
          </div>
        </div>

        <button
          className="flex dark:border-nb-gray-900 items-center cursor-pointer group"
          onClick={() => toast.dismiss(toastId)}
        >
          <div
            className={
              "p-2 hover:bg-nb-gray-900 rounded-md opacity-50 group-hover:opacity-100"
            }
          >
            <XIcon size={16} />
          </div>
        </button>
      </div>
    </motion.div>
  );
}

export function notify<T>(props: NotifyProps<T>) {
  return toast.custom((id) => <Notification {...props} toastId={id} />, {
    duration: Infinity,
  });
}
