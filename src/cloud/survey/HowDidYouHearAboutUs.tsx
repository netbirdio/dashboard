import Button from "@components/Button";
import { Label } from "@components/Label";
import { Modal, ModalContent } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useLocalStorage } from "@hooks/useLocalStorage";
import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { submitHubspotForm } from "@/cloud/analytics/Hubspot";
import { HubspotFormField } from "@/contexts/AnalyticsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useAccount } from "@/modules/account/useAccount";
import { referralSourceOptions } from "@/modules/onboarding/OnboardingSurvey";

export default function HowDidYouHearAboutUs() {
  const { isOwner, loggedInUser } = useLoggedInUser();
  const account = useAccount();
  const params = useSearchParams();
  const hsId = params?.get("hs_id") ?? "";
  const gaId = params?.get("ga_id") ?? "";

  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useLocalStorage(
    "netbird-survey-pending",
    true,
  );

  const [referralSource, setReferralSource] = useState("");

  const submitForm = async () => {
    setIsPending(false);
    setOpen(false);
    let fields: HubspotFormField[] = [];
    try {
      if (loggedInUser) {
        fields = [
          {
            name: "email",
            value: loggedInUser?.email || "",
          },
          {
            name: "how_did_you_hear_about_us",
            value: referralSource || "Not specified",
          },
        ];
      }
      await submitHubspotForm({
        id: loadConfig().hubspotSurveyFormId ?? "",
        fields,
        hubspotQueryId: hsId,
        gaId,
      });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (!account) return;

    const createdAt = dayjs(account.created_at);
    const cutoffDate = dayjs("2025-07-04T18:00:00"); // Only accounts created before this date will see the modal
    const expiryDate = dayjs("2025-07-10T23:59:59"); // Modal is valid until this date

    const isCreatedBeforeToday = createdAt.isBefore(cutoffDate);
    const isBeforeExpiryDate = dayjs().isBefore(expiryDate);

    if (isCreatedBeforeToday && isBeforeExpiryDate && isPending && isOwner) {
      setOpen(true);
    }
  }, [account, isOwner, isPending]);

  const randomizedOptions = useMemo(() => {
    return referralSourceOptions.sort(() => Math.random() - 0.5);
  }, []);

  return (
    process.env.APP_ENV !== "test" && (
      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setIsPending(false);
          }
        }}
      >
        <ModalContent
          maxWidthClass={cn("relative", "max-w-md")}
          className={"z-[9999]"}
          showClose={true}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <GradientFadedBackground />
          <div
            className={
              "mx-auto text-center flex flex-col items-center justify-center z-[1] mt-2"
            }
          >
            <h2 className={"text-xl my-0 leading-[1.5] text-center"}>
              We’d love to hear from you
            </h2>
            <Paragraph
              className={cn("text-sm text-center max-w-[400px] px-4 mt-2")}
            >
              Help us improve by sharing how you discovered NetBird. Your
              feedback truly helps us grow.
            </Paragraph>
          </div>
          <div className={"px-8 py-3 flex flex-col mt-5 z-0 gap-6"}>
            <div className={"flex w-full flex-col gap-2"}>
              <Label>How did you hear about NetBird?</Label>
              <SelectDropdown
                value={referralSource}
                onChange={setReferralSource}
                options={randomizedOptions}
                showValues={false}
                placeholder={"Please select an option..."}
                variant={"dropdown"}
              />
            </div>

            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={submitForm}
            >
              Submit & Continue
            </Button>
          </div>
        </ModalContent>
      </Modal>
    )
  );
}
