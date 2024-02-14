import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Textarea } from "@components/Textarea";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import {
  GeoLocationCheck,
  OperatingSystemVersionCheck,
  PostureCheck,
} from "@/interfaces/PostureCheck";
import { GeoLocationCheckCard } from "@/modules/access-control/posture-checks/GeoLocationCheckCard";
import { NetBirdVersionCheckCard } from "@/modules/access-control/posture-checks/NetBirdVersionCheckCard";
import { OperatingSystemCheck } from "@/modules/access-control/posture-checks/OperatingSystemCheck";
import { PostureCheckIcons } from "@/modules/access-control/posture-checks/PostureCheckIcons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (check: PostureCheck) => void;
  postureCheck?: PostureCheck;
};

export default function PostureCheckModal({
  open,
  onOpenChange,
  onSuccess,
  postureCheck,
}: Props) {
  const postureCheckRequest = useApiCall("/posture-checks");
  const { mutate } = useSWRConfig();

  const [name, setName] = useState(postureCheck?.name || "");
  const [description, setDescription] = useState(
    postureCheck?.description || "",
  );

  const [nbVersionCheck, setNbVersionCheck] = useState(
    postureCheck?.checks.nb_version_check || undefined,
  );
  const [geoLocationCheck, setGeoLocationCheckCheck] = useState(
    postureCheck?.checks.geo_location_check || undefined,
  );
  const [osVersionCheck, setOsVersionCheck] = useState(
    postureCheck?.checks.os_version_check || undefined,
  );

  const [slide, setSlide] = useState(0);

  const validateOSCheck = (osCheck?: OperatingSystemVersionCheck) => {
    if (!osCheck) return;
    const os = osCheck;
    if (os.darwin && os.darwin.min_version == "") os.darwin.min_version = "0";
    if (os.android && os.android.min_version == "")
      os.android.min_version = "0";
    if (os.windows && os.windows.min_kernel_version == "")
      os.windows.min_kernel_version = "0";
    if (os.linux && os.linux.min_kernel_version == "")
      os.linux.min_kernel_version = "0";
    if (os.ios && os.ios.min_version == "") os.ios.min_version = "0";
    return os;
  };

  const validateLocationCheck = (locationCheck?: GeoLocationCheck) => {
    if (!locationCheck) return;
    if (!locationCheck.locations) return;
    return {
      action: locationCheck.action,
      locations: locationCheck.locations.map((location) => {
        if (location.city_name == "")
          return { country_code: location.country_code };
        return {
          country_code: location.country_code,
          city_name: location.city_name,
        };
      }),
    };
  };

  const updateOrCreatePostureCheck = () => {
    const newData = {
      name,
      description,
      checks: {
        nb_version_check: nbVersionCheck,
        geo_location_check: validateLocationCheck(geoLocationCheck),
        os_version_check: validateOSCheck(osVersionCheck),
      },
    };

    const updateOrCreate = !postureCheck
      ? () =>
          postureCheckRequest.post(newData).then((check: PostureCheck) => {
            mutate("/posture-checks");
            onSuccess?.(check);
            onOpenChange(false);
          })
      : () =>
          postureCheckRequest
            .put({ ...newData, id: postureCheck.id }, `/${postureCheck.id}`)
            .then((check: PostureCheck) => {
              mutate("/posture-checks").then();
              onSuccess?.(check);
              onOpenChange(false);
            });

    notify({
      title: `Posture Check ${newData.name}`,
      description: `Posture Check was ${
        postureCheck ? "updated" : "created"
      } successfully.`,
      loadingMessage: `${
        postureCheck ? "Updating" : "Creating"
      } your posture check...`,
      promise: updateOrCreate(),
    });
  };

  const isAtLeastOneCheckEnabled =
    !!nbVersionCheck || !!geoLocationCheck || !!osVersionCheck;
  const canCreate = !isEmpty(name) && isAtLeastOneCheckEnabled;

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
              {postureCheck
                ? "Update Posture Check"
                : "Create New Posture Check"}
            </h2>
            <Paragraph className={cn("text-sm text-center max-w-lg")}>
              Use posture checks to further restrict access in your network.
            </Paragraph>
          </div>
          <GradientFadedBackground />

          <div className={"mb-6 flex-col gap-3 flex mt-5"}>
            <div className={"px-4 z-10"}>
              {slide === 0 ? (
                <>
                  <NetBirdVersionCheckCard
                    value={nbVersionCheck}
                    onChange={setNbVersionCheck}
                  />
                  <GeoLocationCheckCard
                    value={geoLocationCheck}
                    onChange={setGeoLocationCheckCheck}
                  />
                  <OperatingSystemCheck
                    value={osVersionCheck}
                    onChange={setOsVersionCheck}
                  />
                </>
              ) : (
                <div className={"flex flex-col gap-6 px-4 mt-3 mb-2"}>
                  <div>
                    <Label>Name of the Posture Check</Label>
                    <HelpText>
                      Set an easily identifiable name for your posture check.
                    </HelpText>
                    <Input
                      autoFocus={true}
                      tabIndex={0}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={"e.g., NetBird Version > 0.25.0"}
                    />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <HelpText>
                      Write a short description to add more context to this
                      policy.
                    </HelpText>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        "e.g., Check if the NetBird version is bigger than 0.25.0"
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}
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
              {slide != 1 ? (
                <>
                  <ModalClose asChild={true}>
                    <Button variant={"secondary"}>Cancel</Button>
                  </ModalClose>
                  <Button variant={"primary"} onClick={() => setSlide(1)}>
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  <Button variant={"secondary"} onClick={() => setSlide(0)}>
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    disabled={!canCreate}
                    onClick={updateOrCreatePostureCheck}
                  >
                    {postureCheck
                      ? "Save Posture Check"
                      : "Create Posture Check"}
                  </Button>
                </>
              )}
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
