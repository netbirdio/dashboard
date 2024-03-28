import { AnnouncementVariant } from "@components/ui/AnnouncementBanner";
import { useLocalStorage } from "@hooks/useLocalStorage";
import md5 from "crypto-js/md5";
import React, { useEffect, useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";

const initialAnnouncements: Announcement[] = [];

export interface Announcement extends AnnouncementVariant {
  tag: string;
  text: string;
  link?: string;
  linkText?: string;
  isExternal?: boolean;
  closeable: boolean;
}

interface AnnouncementInfo extends Announcement {
  isOpen: boolean;
  hash: string;
}

type Props = {
  children: React.ReactNode;
};

const AnnouncementContext = React.createContext(
  {} as {
    bannerHeight: number;
    announcements?: AnnouncementInfo[];
    closeAnnouncement: (hash: string) => void;
  },
);

const bannerHeight = 40;

export default function AnnouncementProvider({ children }: Props) {
  const [height, setHeight] = useState(0);
  const [closedAnnouncements, setClosedAnnouncements] = useLocalStorage<
    string[]
  >("netbird-closed-announcements", []);
  const [announcements, setAnnouncements] = useState<AnnouncementInfo[]>();
  const { permission } = useLoggedInUser();

  useEffect(() => {
    if (permission?.dashboard_view === "blocked") return;
    const initial = initialAnnouncements.map((announcement) => {
      const hash = md5(announcement.text).toString();
      const isOpen = !closedAnnouncements.some((h) => h === hash);
      return {
        ...announcement,
        hash,
        isOpen,
      };
    });
    if (initial.length > 0) {
      setAnnouncements(initial);
    }
  }, [closedAnnouncements]);

  const closeAnnouncement = (hash: string) => {
    setClosedAnnouncements([...closedAnnouncements, hash]);
    setAnnouncements(() => {
      return announcements?.map((a) => {
        if (a.hash === hash) {
          return { ...a, isOpen: false };
        }
        return a;
      });
    });
  };

  useEffect(() => {
    const isAnnouncementOpen = announcements?.some((a) => a.isOpen);
    if (isAnnouncementOpen) {
      setHeight(bannerHeight);
    } else {
      setHeight(0);
    }
  }, [announcements]);

  return (
    <AnnouncementContext.Provider
      value={{ bannerHeight: height, announcements, closeAnnouncement }}
    >
      {children}
    </AnnouncementContext.Provider>
  );
}

export const useAnnouncement = () => {
  return React.useContext(AnnouncementContext);
};
