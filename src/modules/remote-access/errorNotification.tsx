import { IconCircleX } from "@tabler/icons-react";
import { notify } from "@components/Notification";

/**
 * sendErrorNotification shows a remote-access failure as a toast. Shared by the
 * VNC and RDP pages so both report failures with the same wording, icon and
 * dwell time.
 */
export function sendErrorNotification(title: string, message: string): void {
  notify({
    title,
    description: message,
    icon: <IconCircleX size={24} />,
    backgroundColor: "bg-red-500",
    duration: 10000,
  });
}
