import { AnnouncementVariant } from "@components/ui/AnnouncementBanner";
import md5 from "crypto-js/md5";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { isNetBirdHosted } from "@utils/netbird";

const ANNOUNCEMENTS_URL =
  "https://raw.githubusercontent.com/netbirdio/dashboard/main/announcements.json";
const STORAGE_KEY = "netbird-announcements";
const CACHE_DURATION_MS = 30 * 60 * 1000;
const BANNER_HEIGHT = 40;

interface AnnouncementStore {
  timestamp: number;
  announcements: Announcement[];
  closedAnnouncements: string[];
}

export interface Announcement extends AnnouncementVariant {
  tag: string;
  text: string;
  link?: string;
  linkText?: string;
  isExternal?: boolean;
  closeable: boolean;
  isCloudOnly: boolean;
}

interface AnnouncementInfo extends Announcement {
  isOpen: boolean;
  hash: string;
}

type Props = {
  children: React.ReactNode;
};

const AnnouncementContext = createContext(
  {} as {
    bannerHeight: number;
    announcements?: AnnouncementInfo[];
    closeAnnouncement: (hash: string) => void;
    setAnnouncements: React.Dispatch<
      React.SetStateAction<AnnouncementInfo[] | undefined>
    >;
  },
);

const getAnnouncements = async (): Promise<AnnouncementInfo[]> => {
  try {
    let stored: AnnouncementStore | null = null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      stored = data ? JSON.parse(data) : null;
    } catch {}

    const now = Date.now();

    let raw: Announcement[];

    if (stored && now - stored.timestamp < CACHE_DURATION_MS) {
      raw = stored.announcements;
    } else {
      const response = await fetch(ANNOUNCEMENTS_URL);
      if (!response.ok) return [];

      raw = await response.json();
    }

    const isCloud = isNetBirdHosted();
    const filtered = raw.filter((a) => !a.isCloudOnly || isCloud);
    const hashes = new Set(filtered.map((a) => md5(a.text).toString()));
    const closed = (stored?.closedAnnouncements ?? []).filter((h) =>
      hashes.has(h),
    );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timestamp: now,
          announcements: raw,
          closedAnnouncements: closed,
        }),
      );
    } catch {}

    return filtered.map((a) => {
      const hash = md5(a.text).toString();
      return { ...a, hash, isOpen: !closed.includes(hash) };
    });
  } catch {
    return [];
  }
};

const saveAnnouncements = (closedAnnouncements: string[]) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const stored: AnnouncementStore | null = data ? JSON.parse(data) : null;
    if (stored) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...stored, closedAnnouncements }),
      );
    }
  } catch {}
};

export default function AnnouncementProvider({ children }: Readonly<Props>) {
  const [announcements, setAnnouncements] = useState<AnnouncementInfo[]>();
  const { isRestricted } = usePermissions();
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (announcements !== undefined || isRestricted || fetchingRef.current)
      return;
    fetchingRef.current = true;
    getAnnouncements()
      .then((a) => setAnnouncements(a))
      .finally(() => (fetchingRef.current = false));
  }, [announcements, isRestricted]);

  const closeAnnouncement = (hash: string) => {
    if (!announcements) return;
    const updated = announcements.map((a) =>
      a.hash === hash ? { ...a, isOpen: false } : a,
    );
    const closedAnnouncements = updated
      .filter((a) => !a.isOpen)
      .map((a) => a.hash);
    saveAnnouncements(closedAnnouncements);
    setAnnouncements(updated);
  };

  const bannerHeight = announcements?.some((a) => a.isOpen) ? BANNER_HEIGHT : 0;

  return (
    <AnnouncementContext.Provider
      value={{
        bannerHeight,
        announcements,
        closeAnnouncement,
        setAnnouncements,
      }}
    >
      {children}
    </AnnouncementContext.Provider>
  );
}

export const useAnnouncement = () => useContext(AnnouncementContext);
