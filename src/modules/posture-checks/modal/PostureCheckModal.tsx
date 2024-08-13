import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import { ExternalLinkIcon, LayoutList, ShieldCheck, Text } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import {
  GeoLocationCheck,
  OperatingSystemVersionCheck,
  PostureCheck,
} from "@/interfaces/PostureCheck";
import { PostureCheckGeoLocation } from "@/modules/posture-checks/checks/PostureCheckGeoLocation";
import { PostureCheckNetBirdVersion } from "@/modules/posture-checks/checks/PostureCheckNetBirdVersion";
import { PostureCheckOperatingSystem } from "@/modules/posture-checks/checks/PostureCheckOperatingSystem";
import { PostureCheckPeerNetworkRange } from "@/modules/posture-checks/checks/PostureCheckPeerNetworkRange";
import { PostureCheckProcess } from "@/modules/posture-checks/checks/PostureCheckProcess";

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
  const postureCheckRequest = useApiCall<PostureCheck>("/posture-checks");
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
  const [peerNetworkRangeCheck, setPeerNetworkRangeCheck] = useState(
    postureCheck?.checks.peer_network_range_check || undefined,
  );
  const [processCheck, setProcessCheck] = useState(
    postureCheck?.checks.process_check || undefined,
  );

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
        peer_network_range_check: peerNetworkRangeCheck,
        process_check: processCheck,
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
    !!nbVersionCheck ||
    !!geoLocationCheck ||
    !!osVersionCheck ||
    !!peerNetworkRangeCheck ||
    !!processCheck;
  const canCreate = !isEmpty(name) && isAtLeastOneCheckEnabled;

  const [tab, setTab] = useState("checks");

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <ModalContent
          maxWidthClass={cn("relative", "max-w-2xl")}
          showClose={true}
        >
          <ModalHeader
            icon={<ShieldCheck size={19} />}
            title={
              postureCheck ? "Update Posture Check" : "Create Posture Check"
            }
            description={
              "Use posture checks to further restrict access in your network."
            }
            color={"netbird"}
          />

          <Tabs onValueChange={(v) => setTab(v)} defaultValue={tab} value={tab}>
            <TabsList justify={"start"} className={"px-8"}>
              <TabsTrigger value={"checks"}>
                <LayoutList size={16} />
                Checks
              </TabsTrigger>

              <TabsTrigger
                value={"general"}
                disabled={!isAtLeastOneCheckEnabled}
              >
                <Text
                  size={16}
                  className={
                    "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                  }
                />
                Name & Description
              </TabsTrigger>
            </TabsList>

            <TabsContent value={"checks"} className={"pb-6 px-8"}>
              <>
                <PostureCheckNetBirdVersion
                  value={nbVersionCheck}
                  onChange={setNbVersionCheck}
                />
                <PostureCheckGeoLocation
                  value={geoLocationCheck}
                  onChange={setGeoLocationCheckCheck}
                />
                <PostureCheckPeerNetworkRange
                  value={peerNetworkRangeCheck}
                  onChange={setPeerNetworkRangeCheck}
                />
                <PostureCheckOperatingSystem
                  value={osVersionCheck}
                  onChange={setOsVersionCheck}
                />
                <PostureCheckProcess
                  value={processCheck}
                  onChange={setProcessCheck}
                />
              </>
            </TabsContent>
            <TabsContent value={"general"} className={"pb-8 px-8"}>
              <div className={"flex flex-col gap-6"}>
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
            </TabsContent>
          </Tabs>

          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={"https://docs.netbird.io/how-to/manage-posture-checks"}
                  target={"_blank"}
                >
                  Posture Checks
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <>
                {tab == "checks" && (
                  <Button
                    variant={"secondary"}
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                )}

                {tab == "general" && (
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("checks")}
                  >
                    Back
                  </Button>
                )}

                {!postureCheck && tab == "checks" && (
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("general")}
                    disabled={!isAtLeastOneCheckEnabled}
                  >
                    Continue
                  </Button>
                )}

                {((!postureCheck && tab == "general") || postureCheck) && (
                  <Button
                    variant={"primary"}
                    disabled={!canCreate}
                    onClick={updateOrCreatePostureCheck}
                  >
                    {postureCheck ? "Save Changes" : "Create Posture Check"}
                  </Button>
                )}
              </>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
