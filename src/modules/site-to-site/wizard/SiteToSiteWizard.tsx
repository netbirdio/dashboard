import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsList, TabsTrigger } from "@components/Tabs";
import useFetchApi, { useApiCall } from "@utils/api";
import { ArrowRightLeft, ExternalLinkIcon, Share2, Shield } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { SiteToSiteScope } from "@/modules/access-control/PolicyRuleFields";
import { ROUTING_PEERS_DOCS_LINK } from "@/modules/site-to-site/routing-peer/routingPeerDeploy";
import {
  defaultSiteResource,
  SITE_TO_SITE_DOCS_LINK,
  siteToSiteScope,
  toRuleResource,
} from "@/modules/site-to-site/siteToSite";
import { useSiteToSite } from "@/modules/site-to-site/SiteToSiteProvider";
import { AccessStep } from "@/modules/site-to-site/wizard/AccessStep";
import { NetworksStep } from "@/modules/site-to-site/wizard/NetworksStep";
import { RoutingPeersStep } from "@/modules/site-to-site/wizard/RoutingPeersStep";
import {
  emptySide,
  SideInfo,
  sideInfo,
  WizardSide,
} from "@/modules/site-to-site/wizard/wizardSides";

type Step = "networks" | "access" | "routers";

type Prepared = {
  source: Network;
  destination: Network;
  sourceResource: NetworkResource;
  destinationResource: NetworkResource;
  scope: SiteToSiteScope;
};

const DESCRIPTION: Record<Step, string> = {
  networks: "Select the two networks to connect. You'll set the access next.",
  access:
    "Choose which resources can talk, starting from each network's first IP range.",
  routers:
    "Without a routing peer, the resources inside a network will not be accessible by any peers.",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Add Site-to-Site Connection: both networks on one screen, then the policy
 * between them, then a routing peer for any network without one.
 */
export const SiteToSiteWizard = ({ open, onOpenChange }: Props) => (
  <Modal open={open} onOpenChange={onOpenChange}>
    {open && <WizardContent onClose={() => onOpenChange(false)} />}
  </Modal>
);

const WizardContent = ({ onClose }: { onClose: () => void }) => {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { networks, resources } = useSiteToSite();
  const [step, setStep] = useState<Step>("networks");
  const [first, setFirst] = useState<WizardSide>(emptySide);
  const [second, setSecond] = useState<WizardSide>(emptySide);
  const [prepared, setPrepared] = useState<Prepared>();
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const createNetwork = useApiCall<Network>("/networks").post;
  const createResource = useApiCall<NetworkResource>("/networks").post;

  const firstInfo = sideInfo(first, networks, resources);
  const secondInfo = sideInfo(second, networks, resources, firstInfo);
  const same =
    !!firstInfo.network && firstInfo.network.id === secondInfo.network?.id;
  const ready = firstInfo.valid && secondInfo.valid && !same;

  // The routing peer step polls, so a peer that registers unlocks Done.
  const { data: liveNetworks } = useFetchApi<Network[]>(
    "/networks",
    false,
    true,
    step === "routers",
    { refreshInterval: 3000 },
  );
  const routeNetworks = useMemo(
    () =>
      routeIds
        .map((id) => (liveNetworks ?? networks)?.find((n) => n.id === id))
        .filter((n): n is Network => !!n),
    [routeIds, liveNetworks, networks],
  );
  const allRouted = routeNetworks.every((n) => (n.routing_peers_count ?? 0) > 0);

  // Creates what a side still lacks and returns its network and the
  // resource the policy starts from.
  const prepareSide = async (info: SideInfo, kind: "source" | "destination") => {
    const network =
      info.network ?? (await createNetwork({ name: info.name, description: "" }));
    if (!info.needsRange) {
      const existing = defaultSiteResource(network, resources, kind);
      if (existing) return { network, resource: existing };
    }
    const resource = await createResource(
      {
        name: info.side.rangeName.trim(),
        description: "",
        address: info.side.range.trim(),
        groups: [],
        enabled: true,
      },
      `/${network.id}/resources`,
    );
    return { network, resource };
  };

  const continueToAccess = async () => {
    if (!ready || isSaving) return;
    setIsSaving(true);
    const promise = (async () => {
      const a = await prepareSide(firstInfo, "source");
      const b = await prepareSide(secondInfo, "destination");
      // New networks and ranges are not in the cached lists yet; the policy
      // fields limit each side to what these lists hold.
      const [freshNetworks, freshResources] = (await Promise.all([
        mutate("/networks"),
        mutate("/networks/resources"),
      ])) as [Network[] | undefined, NetworkResource[] | undefined];
      const source =
        freshNetworks?.find((n) => n.id === a.network.id) ?? a.network;
      const destination =
        freshNetworks?.find((n) => n.id === b.network.id) ?? b.network;
      setPrepared({
        source,
        destination,
        sourceResource: a.resource,
        destinationResource: b.resource,
        scope: siteToSiteScope(source, destination, freshResources ?? resources),
      });
      setFirst({ ...emptySide, networkId: source.id });
      setSecond({ ...emptySide, networkId: destination.id });
      setStep("access");
    })().finally(() => setIsSaving(false));

    notify({
      title: "Site-to-Site Connection",
      description: "Networks are ready to connect.",
      loadingMessage: "Preparing networks...",
      promise,
      preventSuccessToast: true,
    });
  };

  const onPolicyCreated = (policy: Policy) => {
    mutate("/networks/site-to-site");
    mutate("/policies");
    const rule = policy.rules?.[0];
    const touched = [rule?.sourceResource?.id, rule?.destinationResource?.id];
    const ids = (networks ?? [])
      .filter((n) => touched.some((id) => id && n.resources?.includes(id)))
      .filter((n) => !n.routing_peers_count)
      .map((n) => n.id);
    setRouteIds(ids);
    setStep("routers");
  };

  const finish = () => {
    mutate("/networks");
    mutate("/networks/site-to-site");
    onClose();
  };

  const rangeOf = (network: Network) =>
    resources?.find(
      (r) => network.resources?.includes(r.id) && r.type === "subnet",
    )?.address;

  const title =
    step === "routers" && routeNetworks.length > 0
      ? "Add Routing Peers"
      : "Add Site-to-Site Connection";

  const footer = (actions: React.ReactNode, learn = SITE_TO_SITE_DOCS_LINK) => (
    <ModalFooter className={"items-center"}>
      <div className={"w-full"}>
        <Paragraph className={"text-sm mt-auto"}>
          Learn more about
          <InlineLink href={learn} target={"_blank"}>
            {learn === ROUTING_PEERS_DOCS_LINK ? "Routing Peers" : "Site-to-Site"}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
      </div>
      <div className={"flex gap-3 w-full justify-end"}>{actions}</div>
    </ModalFooter>
  );

  return (
    <ModalContent maxWidthClass={"max-w-3xl"} showClose={true}>
      <ModalHeader
        icon={<ArrowRightLeft size={16} />}
        title={title}
        description={DESCRIPTION[step]}
        color={"netbird"}
      />
      <Tabs
        value={step}
        onValueChange={(v) => {
          if (v === "networks" && step === "access") setStep("networks");
        }}
      >
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"networks"} disabled={step === "routers"}>
            <NetworkRoutesIcon size={14} />
            Networks
          </TabsTrigger>
          <TabsTrigger value={"access"} disabled={step !== "access"}>
            <Shield size={14} />
            Access Control
          </TabsTrigger>
          <TabsTrigger value={"routers"} disabled={step !== "routers"}>
            <Share2 size={14} />
            Routing Peers
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {step === "networks" && (
        <>
          <div className={"px-8 mt-2 pt-4 pb-8 flex flex-col gap-4"}>
            <NetworksStep
              first={firstInfo}
              second={secondInfo}
              onFirstChange={setFirst}
              onSecondChange={setSecond}
              ready={ready}
            />
            {same && (
              <Callout variant={"error"}>Select two different networks.</Callout>
            )}
          </div>
          {footer(
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                disabled={
                  !ready ||
                  isSaving ||
                  !permission.networks.create ||
                  !permission.policies.create
                }
                onClick={() => void continueToAccess()}
                data-testid={"site-to-site-continue"}
              >
                Continue
              </Button>
            </>,
          )}
        </>
      )}

      {step === "access" && prepared && (
        <div className={"mt-2 pt-4"}>
          <AccessStep
            sourceResource={toRuleResource(prepared.sourceResource)}
            destinationResource={toRuleResource(prepared.destinationResource)}
            scope={prepared.scope}
            networks={networks}
            resources={resources}
            onCreated={onPolicyCreated}
            footer={(addButton) => (
              <div className={"mt-8"}>
                {footer(
                  <>
                    <Button
                      variant={"secondary"}
                      onClick={() => setStep("networks")}
                    >
                      Back
                    </Button>
                    {addButton}
                  </>,
                )}
              </div>
            )}
          />
        </div>
      )}

      {step === "routers" && (
        <>
          <div className={"px-8 mt-2 pt-4 pb-8"}>
            {routeNetworks.length > 0 ? (
              <RoutingPeersStep networks={routeNetworks} rangeOf={rangeOf} />
            ) : (
              <Callout variant={"success"}>
                {prepared
                  ? `${prepared.sourceResource.name} in ${prepared.source.name} can now reach ${prepared.destinationResource.name} in ${prepared.destination.name}.`
                  : "The networks are connected."}{" "}
                Both networks already have routing peers.
              </Callout>
            )}
          </div>
          {footer(
            <>
              {!allRouted && (
                <Button variant={"secondary"} onClick={finish}>
                  Later
                </Button>
              )}
              <Button variant={"primary"} disabled={!allRouted} onClick={finish}>
                Done
              </Button>
            </>,
            ROUTING_PEERS_DOCS_LINK,
          )}
        </>
      )}
    </ModalContent>
  );
};
