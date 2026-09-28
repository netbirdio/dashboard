import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { ExternalLinkIcon, ServerIcon } from "lucide-react";
import React from "react";
import { useSWRConfig } from "swr";
import { REVERSE_PROXY_CLUSTERS_DOCS_LINK } from "@/interfaces/ReverseProxy";
import {
  ClusterSetupContent,
  useClusterSetup,
} from "@/modules/reverse-proxy/clusters/ClusterSetupContent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ClustersModal = ({ open, onOpenChange }: Props) => {
  const { mutate } = useSWRConfig();
  const setup = useClusterSetup();
  const { tab, canAdvance, isCloudDeploy, proxyRegistered } = setup;

  const finishSetup = () => {
    onOpenChange(false);
    mutate("/reverse-proxies/clusters");
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"relative max-w-[600px]"} showClose={true}>
        <ModalHeader
          icon={<ServerIcon size={16} />}
          title={"Setup Cluster"}
          description={"Setup a proxy cluster on infra you own"}
          color={"netbird"}
        />

        <ClusterSetupContent setup={setup} />

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                href={REVERSE_PROXY_CLUSTERS_DOCS_LINK}
                target={"_blank"}
              >
                Proxy Cluster
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            {tab === "domain" && (
              <>
                <ModalClose asChild={true}>
                  <Button variant={"secondary"}>Cancel</Button>
                </ModalClose>
                <Button
                  variant={"primary"}
                  onClick={setup.next}
                  disabled={!canAdvance}
                >
                  Continue
                </Button>
              </>
            )}
            {tab === "dns" && (
              <>
                <Button variant={"secondary"} onClick={setup.back}>
                  Back
                </Button>
                <Button variant={"primary"} onClick={setup.next}>
                  Continue
                </Button>
              </>
            )}
            {tab === "install" && (
              <>
                <Button variant={"secondary"} onClick={setup.back}>
                  Back
                </Button>
                <Button
                  variant={"primary"}
                  onClick={finishSetup}
                  disabled={isCloudDeploy && !proxyRegistered}
                >
                  Finish Setup
                </Button>
              </>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
