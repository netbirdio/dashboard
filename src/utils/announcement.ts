import type { Announcement } from "@/contexts/AnnouncementProvider";

// deploymentAnnouncement turns the text an operator sets through
// NETBIRD_ANNOUNCEMENT into the announcement the banner shows for it: up for
// good (not closeable), for every edition, and in the prominent variant,
// since its job is to tell one deployment apart from another at a glance. A
// development cluster uses it to say which management instance each of its
// dashboards talks to. Blank text means no announcement.
export const deploymentAnnouncement = (
  text?: string,
): Announcement | undefined => {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  return {
    tag: "",
    text: trimmed,
    variant: "important",
    closeable: false,
    isCloudOnly: false,
  };
};
