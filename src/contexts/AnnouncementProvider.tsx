import { AnnouncementVariant } from "@components/ui/AnnouncementBanner";
import md5 from "crypto-js/md5";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { trialExpiresInfo, usageLimitInfo } from "@/contexts/BillingProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { isNetBirdCloud } from "@utils/netbird";

const ANNOUNCEMENTS_URL =
  "https://raw.githubusercontent.com/netbirdio/dashboard/main/announcements.json";
const STORAGE_KEY = "netbird-announcements";
const CACHE_DURATION_MS = 30 * 60 * 1000;

// MSP only
const initialMSPAnnouncements: Announcement[] = [
  {
    tag: "New",
    text: "Huntress now integrates with NetBird",
    link: "https://docs.netbird.io/manage/access-control/endpoint-detection-and-response/huntress-edr",
    linkText: "Learn more",
    variant: "default",
    isExternal: true,
    closeable: true,
    isCloudOnly: true,
  },
];

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
    setBannerHeight: (height: number) => void;
    announcements?: AnnouncementInfo[];
    closeAnnouncement: (hash: string) => void;
    setAnnouncements: React.Dispatch<
      React.SetStateAction<AnnouncementInfo[] | undefined>
    >;
  },
);

const getRemoteAnnouncements = async (): Promise<{
  announcements: Announcement[];
  closedAnnouncements: string[];
}> => {
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
      if (!response.ok) {
        return {
          announcements: [],
          closedAnnouncements: stored?.closedAnnouncements ?? [],
        };
      }
      raw = await response.json();
    }

    const isCloud = isNetBirdCloud();
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

    return { announcements: filtered, closedAnnouncements: closed };
  } catch {
    return { announcements: [], closedAnnouncements: [] };
  }
};

const saveClosedAnnouncements = (closedAnnouncements: string[]) => {
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
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const { isRestricted } = usePermissions();
  const { isMSPInTenantContext, isMSPInMSPContext, isMspInfoLoading } =
    useMSP();
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (announcements !== undefined || isRestricted || fetchingRef.current)
      return;
    if (isMspInfoLoading) return;

    fetchingRef.current = true;

    getRemoteAnnouncements()
      .then(({ announcements: remoteAnnouncements, closedAnnouncements }) => {
        const isCloud = isNetBirdCloud();

        // Start with remote announcements
        let allAnnouncements: AnnouncementInfo[] = remoteAnnouncements.map(
          (a) => {
            const hash = md5(a.text).toString();
            return {
              ...a,
              hash,
              isOpen: !closedAnnouncements.includes(hash),
            };
          },
        );

        // Add MSP announcements if in MSP context
        if (isMSPInTenantContext || isMSPInMSPContext) {
          const mspAnnouncements = initialMSPAnnouncements
            .filter((a) => !a.isCloudOnly || isCloud)
            .map((a) => {
              const hash = md5(a.text).toString();
              return {
                ...a,
                hash,
                isOpen: !closedAnnouncements.includes(hash),
              };
            });
          allAnnouncements.unshift(...mspAnnouncements);
        }

        // Add billing announcements (initially closed, opened by BillingProvider)
        allAnnouncements.unshift({
          ...trialExpiresInfo,
          hash: md5(trialExpiresInfo.text).toString(),
          isOpen: false,
        });

        allAnnouncements.unshift({
          ...usageLimitInfo,
          hash: md5(usageLimitInfo.text).toString(),
          isOpen: false,
        });

        setAnnouncements(allAnnouncements);
      })
      .finally(() => (fetchingRef.current = false));
  }, [
    announcements,
    isRestricted,
    isMspInfoLoading,
    isMSPInTenantContext,
    isMSPInMSPContext,
  ]);

  const closeAnnouncement = (hash: string) => {
    if (!announcements) return;
    const updated = announcements.map((a) =>
      a.hash === hash ? { ...a, isOpen: false } : a,
    );
    const closedAnnouncements = updated
      .filter((a) => !a.isOpen)
      .map((a) => a.hash);
    saveClosedAnnouncements(closedAnnouncements);
    setAnnouncements(updated);
  };

  const bannerHeight = announcements?.some((a) => a.isOpen)
    ? measuredHeight
    : 0;

  return (
    <AnnouncementContext.Provider
      value={{
        bannerHeight,
        setBannerHeight: setMeasuredHeight,
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
