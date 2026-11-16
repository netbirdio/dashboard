"use client";

import { IconSettings2 } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FolderGit2Icon,
  type LucideIcon,
  MonitorSmartphone,
  NetworkIcon,
  X,
} from "lucide-react";
import { useSWRConfig } from "swr";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import type { PageContextEntry, PageContextType } from "@/interfaces/Assistant";
import { OSLogo } from "@/modules/peers/PeerOSCell";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

function ChipIcon({
  entry,
  os,
  user,
  Icon,
}: Readonly<{
  entry: PageContextEntry;
  os?: string;
  user?: {
    name?: string;
    email?: string;
    id?: string;
    isServiceUser?: boolean;
  };
  Icon?: LucideIcon;
}>) {
  if (os) {
    return (
      <span className="flex h-4 w-4 items-center justify-center grayscale">
        <OSLogo os={os} size={14} />
      </span>
    );
  }

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
}: Readonly<{
  entry: PageContextEntry;
  onDismiss: () => void;
}>) {
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

export function AssistantContextChip({
  entry,
  onDismiss,
}: Readonly<{
  entry: PageContextEntry | null;
  onDismiss: () => void;
}>) {
  return (
    <AnimatePresence initial={false}>
      {entry && (
        <motion.div
          // A constant key: keying on entry.key would animate the slab out and back in on every context change.
          key="context"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-x-0 z-10"
          style={{ bottom: "calc(100% - 20px)" }}
        >
          <Chip entry={entry} onDismiss={onDismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// These must match the SWR keys `useFetchApi` writes.
const SOURCES: Partial<Record<PageContextType, string[]>> = {
  peer: ["/peers"],
  group: ["/groups"],
  network: ["/networks"],
  user: ["/users?service_user=false", "/users?service_user=true"],
};

const ICONS: Partial<Record<PageContextType, typeof NetworkIcon>> = {
  peer: MonitorSmartphone,
  group: FolderGit2Icon,
  network: NetworkIcon,
};

const KINDS: Record<PageContextType, string> = {
  peer: "Peer",
  group: "Group",
  network: "Network",
  user: "User",
  settings: "Settings",
  integration: "Integration",
};

interface CachedRow {
  id?: string;
  name?: string;
  email?: string;
  os?: string;
  is_service_user?: boolean;
}

export interface ContextChipData {
  label: string;
  // The resource's real name only, unlike `label`: it is sent to the model.
  name?: string;
  kind: string;
  Icon?: typeof NetworkIcon;
  os?: string;
  user?: {
    name?: string;
    email?: string;
    id?: string;
    isServiceUser?: boolean;
  };
}

export function useContextChip(entry: PageContextEntry): ContextChipData {
  const { cache } = useSWRConfig();

  const row = entry.id
    ? (SOURCES[entry.type] ?? [])
        .flatMap(
          (key) => (cache.get(key)?.data as CachedRow[] | undefined) ?? [],
        )
        .find((candidate) => candidate?.id === entry.id)
    : undefined;

  return {
    label: row?.name || row?.email || entry.label || KINDS[entry.type],
    name: row?.name || row?.email,
    kind: KINDS[entry.type],
    Icon: ICONS[entry.type],
    os: row?.os,
    user:
      entry.type === "user"
        ? {
            name: row?.name,
            email: row?.email,
            id: entry.id,
            isServiceUser: row?.is_service_user,
          }
        : undefined,
  };
}
