import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import React, { useState } from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { GeoLocationCheckCard } from "@/modules/access-control/posture-checks/GeoLocationCheckCard";
import { NetBirdVersionCheckCard } from "@/modules/access-control/posture-checks/NetBirdVersionCheckCard";
import { OperatingSystemCheck } from "@/modules/access-control/posture-checks/OperatingSystemCheck";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  postureCheck?: PostureCheck;
};

export default function PostureCheckModal({
  open,
  onOpenChange,
  onSuccess,
  postureCheck,
}: Props) {
  const [nbVersionCheck, setNbVersionCheck] = useState(
    postureCheck?.checks.nb_version_check || undefined,
  );

  const [geoLocationCheck, setGeoLocationCheckCheck] = useState(
    postureCheck?.checks.geo_location_check || undefined,
  );

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <ModalContent
          maxWidthClass={cn("relative", "max-w-xl")}
          showClose={true}
        >
          <PostureCheckIcons />
          <div
            className={
              "mx-auto text-center flex flex-col items-center justify-center mt-6"
            }
          >
            <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
              Create New Posture Check
            </h2>
            <Paragraph className={cn("text-sm text-center max-w-lg")}>
              Use posture checks to further restrict access in your network.
            </Paragraph>
          </div>
          <GradientFadedBackground />

          <div className={"mb-6 flex-col gap-3 flex mt-5"}>
            <div className={"px-4 z-10"}>
              <NetBirdVersionCheckCard
                value={nbVersionCheck}
                onChange={setNbVersionCheck}
              />
              <GeoLocationCheckCard
                value={geoLocationCheck}
                onChange={setGeoLocationCheckCheck}
              />
              <OperatingSystemCheck />
            </div>
          </div>

          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                  }
                  target={"_blank"}
                >
                  Posture Checks
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button variant={"primary"}>Continue</Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
