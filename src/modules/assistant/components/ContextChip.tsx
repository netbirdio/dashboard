/**
 * "You're looking at this" — the slab tucked under the composer.
 *
 * Sits directly above the input because that's where the next message is
 * formed, and this is part of it: whatever the chip names is attached to what
 * the user types. The ✕ detaches it.
 *
 * Each surface wears the mark it already wears elsewhere in the dashboard — a
 * peer's OS logo, a user's avatar, the settings tab's own icon — so the chip
 * reads as "that page" rather than as a symbol to decode.
 *
 * It slides out from behind the composer on arrival and back under it on the
 * way out, which is also how it explains itself: the context belongs to the
 * input, not to the conversation above it.
 */
"use client";

import { IconSettings2 } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { type LucideIcon, X } from "lucide-react";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { OSLogo } from "@/modules/peers/PeerOSCell";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";
import type { AssistantContextEntry } from "../context/AssistantContextProvider";
import { useContextChip } from "../context/useContextLabel";

function ChipIcon({
  entry,
  os,
  user,
  Icon,
}: {
  entry: AssistantContextEntry;
  os?: string;
  user?: {
    name?: string;
    email?: string;
    id?: string;
    isServiceUser?: boolean;
  };
  Icon?: LucideIcon;
}) {
  if (os) {
    return (
      <span className="flex h-4 w-4 items-center justify-center grayscale [&_*]:!text-[13px]">
        <OSLogo os={os} />
      </span>
    );
  }

  // A service user has no person behind it, so the users table gives it a cog
  // in place of an avatar. Same here.
  if (user?.isServiceUser) {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-nb-gray-850 text-nb-gray-200">
        <IconSettings2 size={11} />
      </span>
    );
  }

  if (user) {
    return (
      <SmallUserAvatar
        name={user.name}
        email={user.email}
        id={user.id}
        size={"sm"}
        className={"!h-4 !w-4 text-[9px]"}
      />
    );
  }

  // The nav's own marks. Not the individual tab icons: the chip names the page
  // the user is on, and switching tabs shouldn't make its icon jump around.
  if (entry.type === "integration" || entry.type === "settings") {
    return (
      <span className="flex h-4 w-4 items-center justify-center text-nb-gray-300 [&_svg]:h-3.5 [&_svg]:w-3.5">
        {entry.type === "settings" ? <SettingsIcon /> : <IntegrationIcon />}
      </span>
    );
  }

  return Icon ? <Icon size={13} className="text-nb-gray-300" /> : null;
}

function Chip({
  entry,
  onDismiss,
}: {
  entry: AssistantContextEntry;
  onDismiss: () => void;
}) {
  const { label, Icon, os, user } = useContextChip(entry);

  return (
    <div className="flex w-full shrink-0 items-center gap-2 rounded-t-2xl border border-b-0 border-nb-gray-850 bg-nb-gray-920 pb-7 pl-3 pr-2.5 pt-2">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <ChipIcon entry={entry} os={os} user={user} Icon={Icon} />
      </span>

      <span className="min-w-0 truncate text-chat text-nb-gray-200">
        {label}
      </span>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Remove context"
        title="Don't send this"
        className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-nb-gray-300 transition-colors hover:bg-nb-gray-850 hover:text-nb-gray-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ContextChip({
  entry,
  onDismiss,
}: {
  entry: AssistantContextEntry | null;
  onDismiss: () => void;
}) {
  return (
    /*
      Positioned out of the flow entirely, so nothing moves when a context
      arrives or leaves — the animation is one translate, from fully behind the
      composer to its resting place. `bottom: calc(100% - 20px)` is the tuck:
      the slab's lower 20px stay under the composer, which is layered above it
      (`relative z-10` on the composer root).
    */
    <AnimatePresence initial={false}>
      {entry && (
        <motion.div
          /*
            Keyed on nothing that changes between surfaces: switching settings
            tabs, or moving from one peer to another, swaps the label in place.
            Keying on `entry.key` animated the slab out and back in for what the
            user experiences as a small change on the same screen.
          */
          key="context"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          /*
            `z-10` puts it above the empty state, which also claims that layer
            and would otherwise swallow the ✕. The composer is later in the DOM
            at the same level, so it still paints on top of the slab.
          */
          className="absolute inset-x-0 z-10"
          style={{ bottom: "calc(100% - 20px)" }}
        >
          <Chip entry={entry} onDismiss={onDismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ContextChip;
