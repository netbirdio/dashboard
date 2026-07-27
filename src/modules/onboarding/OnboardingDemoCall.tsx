import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { CalendarClockIcon, CalendarIcon, Check } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useTranslations } from "next-intl";
import Avatar from "@/assets/avatars/jack.jpeg";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useExperiment } from "@/cloud/cloud-hooks/useExperiment";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useAccount } from "@/modules/account/useAccount";

type Props = {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
};

const NAME = "Jack Carter";
const BOOK_A_DEMO_URL =
  "https://meetings-eu1.hubspot.com/jack81/selfserve45-dashboard";

export const OnboardingDemoCall = ({ open, onOpenChange }: Props) => {
  const { trackEventV2 } = useAnalytics();
  const account = useAccount();
  const { loggedInUser } = useLoggedInUser();
  const t = useTranslations("onboarding");

  const [variant, variantKey] = useExperiment("onboarding-call", {
    v1: {
      title: t("demoCall.v1.title"),
      desc: t("demoCall.v1.desc"),
      features: [
        t("demoCall.v1.feature1"),
        t("demoCall.v1.feature2"),
        t("demoCall.v1.feature3"),
      ],
      cta: t("demoCall.v1.cta"),
      cancel: t("demoCall.v1.cancel"),
    },
    v2: {
      title: t("demoCall.v2.title"),
      desc: t.rich("demoCall.v2.desc", { br: () => <br /> }),
      features: [],
      cta: t("demoCall.v2.cta"),
      cancel: t("demoCall.v2.cancel"),
    },
    v3: {
      title: t("demoCall.v3.title"),
      desc: t.rich("demoCall.v3.desc", { br: () => <br /> }),
      features: [],
      cta: t("demoCall.v3.cta"),
      cancel: t("demoCall.v3.cancel"),
    },
    v4: {
      title: t("demoCall.v4.title"),
      desc: t("demoCall.v4.desc"),
      features: [
        t("demoCall.v4.feature1"),
        t("demoCall.v4.feature2"),
        t("demoCall.v4.feature3"),
      ],
      cta: t("demoCall.v4.cta"),
      cancel: t("demoCall.v4.cancel"),
    },
    v5: {
      title: t("demoCall.v5.title"),
      desc: t.rich("demoCall.v5.desc", { br: () => <br /> }),
      features: [],
      cta: t("demoCall.v5.cta"),
      cancel: t("demoCall.v5.cancel"),
    },
    v6: {
      title: t("demoCall.v6.title"),
      desc: t.rich("demoCall.v6.desc", { br: () => <br /> }),
      features: [],
      cta: t("demoCall.v6.cta"),
      cancel: t("demoCall.v6.cancel"),
    },
  });

  const openBookADemo = () => {
    if (typeof window !== "undefined") {
      trackEventV2(
        "Onboarding Call Experiment",
        variantKey,
        account?.id,
        loggedInUser?.id,
      );
      window.open(BOOK_A_DEMO_URL, "_blank");
      onOpenChange(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        maxWidthClass={"max-w-lg relative !z-[70]"}
        showClose={false}
      >
        <div className={"flex flex-col gap-4 overflow-hidden relative  -top-3"}>
          <div
            className={
              "flex items-center justify-center absolute bottom-0 w-full z-20"
            }
          >
            <Image
              src={Avatar}
              alt={NAME}
              height={50}
              width={50}
              className={"rounded-full"}
            />
          </div>
          <span
            className={
              "absolute inset-0 w-full h-full bg-gradient-to-b from-transparent to-nb-gray-950 z-10"
            }
          ></span>
          <div className={"flex gap-8 relative z-0 opacity-10 grayscale h-4"}>
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
          </div>
          <div
            className={
              "flex gap-8 -left-8 relative z-0 opacity-10 grayscale h-4"
            }
          >
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
          </div>
          <div className={"flex gap-4 relative z-0 opacity-10 grayscale h-4"}>
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
            <NetBirdIcon size={20} />
          </div>
        </div>

        <div
          className={
            "flex items-center justify-center flex-col px-8 gap-3 mt-1"
          }
        >
          <div className={"text-xl font-medium text-center"}>
            {variant?.title}
          </div>
          <div className={"text-sm text-nb-gray-300 text-center"}>
            {variant?.desc}
          </div>
          {variant?.features?.length > 1 && (
            <ul className="flex flex-col gap-3.5 mt-4 mb-3 w-full">
              {variant?.features.map((feature, index) => (
                <li
                  className="flex items-center gap-3 text-sm text-nb-gray-200"
                  key={index}
                >
                  <Check size={16} className={"text-netbird shrink-0"} />
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </div>
        <ModalFooter separator={false} className={"gap-x-2"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"} className={"w-full"}>
              {variant?.cancel}
            </Button>
          </ModalClose>

          <Button
            className={"w-full"}
            variant={"primary"}
            onClick={openBookADemo}
          >
            <CalendarIcon size={15} className={"shrink-0"} />
            {variant?.cta}
          </Button>
        </ModalFooter>
        <div
          className={
            "text-center z-0 mt-3 text-sm text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
          }
        >
          <CalendarClockIcon size={12} />
          <div>
            {t("demoCall.duration", { duration: 30 })}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
};
