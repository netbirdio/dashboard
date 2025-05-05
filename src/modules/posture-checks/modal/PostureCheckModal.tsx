import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import { ExternalLinkIcon, LayoutList, ShieldCheck, Text } from "lucide-react";
import React, { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckGeoLocation } from "@/modules/posture-checks/checks/PostureCheckGeoLocation";
import { PostureCheckNetBirdVersion } from "@/modules/posture-checks/checks/PostureCheckNetBirdVersion";
import { PostureCheckOperatingSystem } from "@/modules/posture-checks/checks/PostureCheckOperatingSystem";
import { PostureCheckPeerNetworkRange } from "@/modules/posture-checks/checks/PostureCheckPeerNetworkRange";
import { PostureCheckProcess } from "@/modules/posture-checks/checks/PostureCheckProcess";
import { usePostureCheck } from "@/modules/posture-checks/usePostureCheck";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (check: PostureCheck) => void;
  postureCheck?: PostureCheck;
  useSave?: boolean;
};

export default function PostureCheckModal({
  open,
  onOpenChange,
  onSuccess,
  postureCheck,
  useSave = true,
}: Props) {
  const { permission } = usePermissions();

  const {
    state: check,
    dispatch: setCheck,
    updateOrCreateAndNotify: updateOrCreate,
  } = usePostureCheck({
    postureCheck,
    onSuccess,
  });

  const close = () => {
    onSuccess && onSuccess(check);
  };

  const isAtLeastOneCheckEnabled =
    !!check?.checks?.nb_version_check ||
    !!check?.checks?.geo_location_check ||
    !!check?.checks?.os_version_check ||
    !!check?.checks?.peer_network_range_check ||
    !!check?.checks.process_check;
  const canCreate =
    !isEmpty(check?.name) &&
    isAtLeastOneCheckEnabled &&
    (permission.policies.create || permission.policies.update);

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
                  value={check?.checks?.nb_version_check}
                  onChange={(v) =>
                    setCheck({
                      type: "version",
                      payload: v,
                    })
                  }
                  disabled={
                    !permission.policies.create || !permission.policies.update
                  }
                />
                <PostureCheckGeoLocation
                  value={check?.checks?.geo_location_check}
                  onChange={(v) =>
                    setCheck({
                      type: "location",
                      payload: v,
                    })
                  }
                  disabled={
                    !permission.policies.create || !permission.policies.update
                  }
                />
                <PostureCheckPeerNetworkRange
                  value={check?.checks?.peer_network_range_check}
                  onChange={(v) =>
                    setCheck({
                      type: "network_range",
                      payload: v,
                    })
                  }
                  disabled={
                    !permission.policies.create || !permission.policies.update
                  }
                />
                <PostureCheckOperatingSystem
                  value={check?.checks?.os_version_check}
                  onChange={(v) =>
                    setCheck({
                      type: "os",
                      payload: v,
                    })
                  }
                  disabled={
                    !permission.policies.create || !permission.policies.update
                  }
                />
                <PostureCheckProcess
                  value={check?.checks?.process_check}
                  onChange={(v) =>
                    setCheck({
                      type: "process_check",
                      payload: v,
                    })
                  }
                  disabled={
                    !permission.policies.create || !permission.policies.update
                  }
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
                    value={check?.name}
                    onChange={(e) =>
                      setCheck({
                        type: "name",
                        payload: e.target.value,
                      })
                    }
                    placeholder={"e.g., NetBird Version > 0.25.0"}
                    disabled={
                      !permission.policies.create || !permission.policies.update
                    }
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <HelpText>
                    Write a short description to add more context to this
                    policy.
                  </HelpText>
                  <Textarea
                    value={check?.description}
                    onChange={(e) =>
                      setCheck({
                        type: "description",
                        payload: e.target.value,
                      })
                    }
                    placeholder={
                      "e.g., Check if the NetBird version is bigger than 0.25.0"
                    }
                    rows={3}
                    disabled={
                      !permission.policies.create || !permission.policies.update
                    }
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
                    onClick={() => {
                      if (useSave) {
                        updateOrCreate();
                      } else {
                        close();
                      }
                    }}
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
