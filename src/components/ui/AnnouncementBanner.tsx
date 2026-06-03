import InlineLink from "@components/InlineLink";
import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import { ArrowRightIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";

const variants = cva(
  {},
  {
    variants: {
      variant: {
        default:
          "bg-neutral-100 border-neutral-200 text-neutral-700 dark:bg-nb-gray-900/50 dark:border-nb-gray-800/30 dark:text-nb-gray-200 border-b",
        important:
          "from-netbird to-netbird-400 bg-gradient-to-b text-black font-normal",
      },
      tagBadge: {
        default:
          "bg-neutral-200 text-neutral-700 dark:bg-nb-gray-200/10 dark:text-nb-gray-100 font-medium",
        important: "bg-nb-gray-900 text-nb-gray-200 font-medium",
      },
      closeButton: {
        default:
          "bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-nb-gray-900 dark:text-nb-gray-300 dark:hover:bg-nb-gray-800 rounded-md p-1",
        important:
          "bg-netbird rounded-md p-1 text-nb-gray-900 hover:bg-nb-gray-900 hover:text-nb-gray-200",
      },
      inlineLink: {
        default: "text-nb-blue-500 dark:text-nb-blue-400 hover:underline",
        important: "!text-black underline hover:opacity-80",
      },
    },
  },
);

export type AnnouncementVariant = VariantProps<typeof variants>;

export const AnnouncementBanner = () => {
  const { closeAnnouncement, announcements, setBannerHeight } =
    useAnnouncement();
  const announcement = announcements?.find((a) => a.isOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !announcement) {
      setBannerHeight(0);
      return;
    }
    const measure = () =>
      setBannerHeight(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [announcement, setBannerHeight]);

  return announcement ? (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center text-left text-sm py-2 pl-4 pr-12 md:px-8 font-light",
        variants({ variant: announcement.variant }),
      )}
    >
      <div className={"flex items-center gap-2 leading-tight"}>
        {announcement.tag && (
          <div
            className={cn(
              "shrink-0 bg-nb-gray-200/10 backdrop-blur text-nb-gray-100 font-medium tracking-wide uppercase text-[10px] py-2.5 px-2 rounded-md leading-[0]",
              variants({ tagBadge: announcement.variant }),
            )}
          >
            {announcement.tag}
          </div>
        )}
        <div>
          <span className={"mr-2"}>{announcement.text}</span>
          {announcement.link && (
            <InlineLink
              href={announcement.link || "#"}
              target={announcement.isExternal ? "_blank" : undefined}
              className={cn(
                "!text-sm",
                variants({ inlineLink: announcement.variant }),
              )}
            >
              {announcement.linkText || "Learn more"}
              <ArrowRightIcon size={14} />
            </InlineLink>
          )}
        </div>
      </div>
      {announcement.closeable && (
        <div className={"absolute right-0 px-4"}>
          <div
            className={cn(
              "rounded-md p-1 text-nb-gray-300 transition-all cursor-pointer",
              variants({ closeButton: announcement.variant }),
            )}
            onClick={() => closeAnnouncement(announcement.hash)}
          >
            <XIcon size={14} />
          </div>
        </div>
      )}
    </div>
  ) : null;
};
