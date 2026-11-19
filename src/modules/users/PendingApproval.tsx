"use client";

import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { NetBirdLogo } from "@components/NetBirdLogo";
import Paragraph from "@components/Paragraph";
import Steps from "@components/Steps";
import { cn } from "@utils/helpers";
import {
  CheckIcon,
  Loader2Icon,
  LogOut,
  RefreshCwIcon,
  UserCircleIcon,
} from "lucide-react";
import * as React from "react";
import { useMatomoVirtualPage } from "@/cloud/analytics/MatomoProvider";
import { useTranslations } from "@/i18n/LocaleProvider";

const parseApproverEmail = (message?: string): string =>
  message?.match(/[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "";

const steps = [
  {
    labelId: "users.accountCreated",
    status: "complete",
    icon: <CheckIcon size={16} />,
  },
  {
    labelId: "users.waitingForApproval",
    status: "current",
    icon: <Loader2Icon size={16} className={"animate-spin text-netbird"} />,
  },
  {
    labelId: "users.joinAccount",
    status: "upcoming",
    icon: <UserCircleIcon size={16} />,
  },
] as const;

type Props = {
  // The refusal from management, which names the owner who can approve.
  error?: { message?: string } | null;
  onRefresh: () => void;
  onLogout: () => void;
};

export const PendingApproval = ({ error, onRefresh, onLogout }: Props) => {
  const t = useTranslations();
  const owner = parseApproverEmail(error?.message);
  useMatomoVirtualPage("pending_approval");

  return (
    <div
      className={
        "min-h-screen w-full bg-nb-gray-950 flex flex-col items-center justify-center gap-8 px-4 py-10"
      }
      data-testid={"pending-approval"}
    >
      <NetBirdLogo size={"large"} mobile={false} />

      <div
        className={
          "w-full max-w-2xl bg-nb-gray-940 border border-nb-gray-910 rounded-lg px-6 sm:px-12 py-8 sm:py-9 flex flex-col gap-10"
        }
      >
        <Steps horizontal={true} className={"pt-0 w-full"}>
          {steps.map(({ labelId, status, icon }, index) => (
            <Steps.Step
              key={labelId}
              step={icon}
              status={status}
              horizontal={true}
              size={"large"}
              line={index < steps.length - 1}
              className={"flex-1 pb-0"}
            >
              <span
                className={cn(
                  "text-sm text-center",
                  status === "upcoming" ? "text-nb-gray-400" : "text-white",
                )}
              >
                {t(labelId)}
              </span>
            </Steps.Step>
          ))}
        </Steps>

        <Paragraph className={"block max-w-md mx-auto text-center"}>
          {t("users.pendingApprovalIntro")}{" "}
          {owner
            ? t.rich("users.askOwnerAt", {
                email: owner,
                address: (chunks) => (
                  <span className={"text-nb-gray-100"}>{chunks}</span>
                ),
              })
            : t("users.askOwner")}
        </Paragraph>

        <div className={"flex flex-col sm:flex-row gap-3 justify-center"}>
          <Button variant={"secondary"} size={"sm"} onClick={onRefresh}>
            <RefreshCwIcon size={16} />
            {t("common.refresh")}
          </Button>
          <Button variant={"default-outline"} size={"sm"} onClick={onLogout}>
            <LogOut size={16} />
            {t("common.logOut")}
          </Button>
        </div>
      </div>

      <Paragraph className={"text-sm"}>
        {t.rich("users.pendingApprovalHelp", {
          docs: (chunks) => (
            <InlineLink
              href={"https://docs.netbird.io/manage/team/approve-users"}
              target={"_blank"}
            >
              {chunks}
            </InlineLink>
          ),
          support: (chunks) => (
            <InlineLink
              href={"https://docs.netbird.io/help/netbird-support"}
              target={"_blank"}
            >
              {chunks}
            </InlineLink>
          ),
        })}
      </Paragraph>
    </div>
  );
};
