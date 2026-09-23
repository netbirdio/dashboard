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

const parseApproverEmail = (message?: string): string =>
  message?.match(/[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "";

const steps = [
  {
    label: "Account Created",
    status: "complete",
    icon: <CheckIcon size={16} />,
  },
  {
    label: "Waiting for Approval",
    status: "current",
    icon: <Loader2Icon size={16} className={"animate-spin text-netbird"} />,
  },
  {
    label: "Join Account",
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
  const owner = parseApproverEmail(error?.message);

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
          {steps.map(({ label, status, icon }, index) => (
            <Steps.Step
              key={label}
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
                {label}
              </span>
            </Steps.Step>
          ))}
        </Steps>

        <Paragraph className={"block max-w-md mx-auto text-center"}>
          Your organization requires new users to be manually approved before
          joining.{" "}
          {owner ? (
            <>
              Ask the owner of the account at{" "}
              <span className={"text-nb-gray-100"}>{owner}</span> to approve
              your access.
            </>
          ) : (
            "Ask the owner of the account to approve your access."
          )}
        </Paragraph>

        <div className={"flex flex-col sm:flex-row gap-3 justify-center"}>
          <Button variant={"secondary"} size={"sm"} onClick={onRefresh}>
            <RefreshCwIcon size={16} />
            Refresh
          </Button>
          <Button variant={"default-outline"} size={"sm"} onClick={onLogout}>
            <LogOut size={16} />
            Log Out
          </Button>
        </div>
      </div>

      <Paragraph className={"text-sm"}>
        Need help?
        <InlineLink
          href={"https://docs.netbird.io/manage/team/approve-users"}
          target={"_blank"}
        >
          Read the Docs
        </InlineLink>
        or
        <InlineLink
          href={"https://docs.netbird.io/help/netbird-support"}
          target={"_blank"}
        >
          Contact Support
        </InlineLink>
      </Paragraph>
    </div>
  );
};
