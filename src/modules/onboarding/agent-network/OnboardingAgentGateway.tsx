import Badge from "@components/Badge";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleIcon,
  CloudIcon,
  ExternalLinkIcon,
  Loader2Icon,
  LockIcon,
  RefreshCwIcon,
  ServerIcon,
} from "lucide-react";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import {
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  ReverseProxyCluster,
} from "@/interfaces/ReverseProxy";
import type { AgentNetworkManagedProxy } from "@/modules/agent-network/AIProvidersProvider";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import EndpointBadge from "@/modules/agent-network/EndpointBadge";
import {
  isKnownManagedProxyState,
  MANAGED_PROXY_STATE,
  ProvisionOutcome,
} from "@/modules/agent-network/managedProxyState";
import { useManagedProxy } from "@/modules/agent-network/useManagedProxy";
import {
  formatElapsed,
  MANAGED_SLOW_HINT_AFTER_S,
  managedGatewayStages,
  privateAccountClusters,
  resolveGatewayEntry,
  SELF_DEPLOY_HINT_AFTER_S,
  SelfDeployPhase,
  selfDeployPhase,
  StageStatus,
} from "@/modules/onboarding/agent-network/gatewayFlow";
import {
  ClusterSetupContent,
  useClusterSetup,
} from "@/modules/reverse-proxy/clusters/ClusterSetupContent";
import { useProxyCluster } from "@/modules/reverse-proxy/clusters/useProxyCluster";

type Props = {
  onBack: () => void;
  onNext: () => void;
  // onSkip leaves the step in the direction the operator was moving, for an
  // account whose endpoint is already served by a proxy of its own or a
  // shared one.
  onSkip: () => void;
};

type GatewayView =
  | { kind: "choice" }
  | { kind: "managed" }
  | { kind: "self-deploy" }
  | { kind: "private-cluster"; address: string }
  | { kind: "conflict"; endpoint: string };

// A managed-proxy POST that left nothing to show but the reason.
type ProvisionFailure = Extract<
  ProvisionOutcome,
  { kind: "unavailable" | "forbidden" | "error" }
>;

// OnboardingAgentGateway sets up the gateway the account's endpoint is served
// from, before any provider is connected: a NetBird-managed gateway, a private
// proxy the account already runs, or a new proxy the operator deploys. An
// account that already has one skips it.
export const OnboardingAgentGateway = ({ onBack, onNext, onSkip }: Props) => {
  const { settings, settingsLoading } = useAIProviders();
  const managed = useManagedProxy(true);
  const { data: clusters, isLoading: clustersLoading } = useFetchApi<
    ReverseProxyCluster[]
  >("/reverse-proxies/clusters", true);
  const { mutate } = useSWRConfig();
  const { isOwner } = useLoggedInUser();
  const privateClusters = privateAccountClusters(clusters);

  // The clusters are part of the wait so the choice opens with every proxy the
  // account can pick already listed.
  const entry = resolveGatewayEntry({
    loading: settingsLoading || managed.isLoading || clustersLoading,
    managedExists: !!managed.proxy,
    settingsEndpoint: settings?.endpoint,
  });

  // The entry picks the first view only. What happens after, such as the
  // settings row a managed POST writes, must not move the operator elsewhere.
  const [view, setView] = useState<GatewayView | null>(null);
  if (
    view === null &&
    entry.kind !== "loading" &&
    entry.kind !== "configured"
  ) {
    setView(entry);
  }

  useEffect(() => {
    if (view === null && entry.kind === "configured") onSkip();
  }, [view, entry.kind, onSkip]);

  const [managedHidden, setManagedHidden] = useState(false);
  const [posting, setPosting] = useState(false);
  const [failure, setFailure] = useState<ProvisionFailure | null>(null);
  // Counts Retry clicks, which restart the elapsed timer.
  const [retries, setRetries] = useState(0);

  const provision = async () => {
    setView({ kind: "managed" });
    setFailure(null);
    setPosting(true);
    const outcome = await managed.provision();
    setPosting(false);
    switch (outcome.kind) {
      case "deployment":
        return;
      case "conflict":
        mutate("/agent-network/settings");
        setView({ kind: "conflict", endpoint: outcome.endpoint });
        return;
      case "not-configured":
        setManagedHidden(true);
        setView({ kind: "self-deploy" });
        return;
      default:
        setFailure(outcome);
    }
  };

  const retry = () => {
    setRetries((n) => n + 1);
    provision();
  };

  const selfDeploy = () => setView({ kind: "self-deploy" });

  if (!view) {
    return (
      <StepLayout
        title={"Set up your gateway"}
        onBack={onBack}
        onNext={onNext}
        canContinue={false}
      >
        <div className={"mt-4 flex justify-center"}>
          <StatusLine status={"active"}>Checking your gateway…</StatusLine>
        </div>
      </StepLayout>
    );
  }

  switch (view.kind) {
    case "choice":
      return (
        <GatewayChoice
          managedAvailable={!managedHidden}
          confirmManaged={!isOwner}
          privateClusters={privateClusters}
          onManaged={provision}
          onPrivateCluster={(address) =>
            setView({ kind: "private-cluster", address })
          }
          onSelfDeploy={selfDeploy}
          onBack={onBack}
          onNext={onNext}
        />
      );
    case "managed":
      return (
        <ManagedGateway
          proxy={managed.proxy}
          posting={posting}
          failure={failure}
          retries={retries}
          onRetry={retry}
          onSelfDeploy={selfDeploy}
          onBack={onBack}
          onNext={onNext}
        />
      );
    case "self-deploy":
      return (
        <SelfDeployGateway
          managedUnavailable={managedHidden}
          onExit={managedHidden ? onBack : () => setView({ kind: "choice" })}
          onNext={onNext}
        />
      );
    case "private-cluster":
      return (
        <PrivateClusterGateway
          address={view.address}
          onBack={onBack}
          onNext={onNext}
        />
      );
    case "conflict":
      return (
        <StepLayout
          title={"Your gateway is already set up"}
          description={
            "This account already has an Agent Network endpoint, so it needs no managed gateway."
          }
          onBack={onBack}
          onNext={onNext}
          canContinue={true}
        >
          <div className={"mt-2 flex justify-center"}>
            <EndpointBadge endpoint={view.endpoint} />
          </div>
        </StepLayout>
      );
  }
};

type ChoiceProps = {
  managedAvailable: boolean;
  // An admin who is not the owner confirms the managed gateway first: it
  // serves the whole account and can't be changed or removed yet.
  confirmManaged: boolean;
  privateClusters: ReverseProxyCluster[];
  onManaged: () => void;
  onPrivateCluster: (address: string) => void;
  onSelfDeploy: () => void;
  onBack: () => void;
  onNext: () => void;
};

const GatewayChoice = ({
  managedAvailable,
  confirmManaged,
  privateClusters,
  onManaged,
  onPrivateCluster,
  onSelfDeploy,
  onBack,
  onNext,
}: ChoiceProps) => {
  const [confirming, setConfirming] = useState(false);
  // The managed gateway leads; a proxy of the account's own waits behind a
  // link, unless it is the only way on.
  const [ownProxyOpen, setOwnProxyOpen] = useState(false);

  return (
    <StepLayout
      title={"Set up your gateway"}
      description={
        "Agents reach your providers through a private gateway that only devices on your network can reach. Choose who runs it."
      }
      onBack={onBack}
      onNext={onNext}
      canContinue={false}
    >
      <div className={"mt-2 flex flex-col gap-3"}>
        {managedAvailable && (
          <ChoiceCard
            icon={<CloudIcon size={16} />}
            title={"Managed gateway"}
            badge={"Recommended"}
            description={
              "NetBird runs a dedicated, private gateway for your account."
            }
            onClick={confirmManaged ? () => setConfirming(true) : onManaged}
            data-testid={"gateway-choice-managed"}
          />
        )}
        {managedAvailable && confirming && (
          <Callout variant={"warning"} data-testid={"gateway-managed-confirm"}>
            The managed gateway serves Agent Network for the whole account, and
            it can&apos;t be changed or removed from the dashboard yet.
            <div className={"flex gap-3 mt-3"}>
              <Button variant={"primary"} size={"xs"} onClick={onManaged}>
                Set up managed gateway
              </Button>
              <Button
                variant={"secondary"}
                size={"xs"}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          </Callout>
        )}
        {managedAvailable && (
          <OwnProxyToggle
            open={ownProxyOpen}
            privateCount={privateClusters.length}
            onToggle={() => setOwnProxyOpen((open) => !open)}
          />
        )}
        {(ownProxyOpen || !managedAvailable) && (
          <div
            id={OWN_PROXY_OPTIONS_ID}
            className={
              "flex flex-col rounded-lg border border-nb-gray-900 divide-y divide-nb-gray-900 overflow-hidden animate-in fade-in duration-200"
            }
          >
            {privateClusters.map((cluster) => (
              <OptionRow
                key={cluster.id ?? cluster.address}
                icon={<LockIcon size={14} />}
                title={cluster.address}
                detail={connectedProxies(cluster.connected_proxies)}
                onClick={() => onPrivateCluster(cluster.address)}
                data-testid={"gateway-choice-private"}
              />
            ))}
            <OptionRow
              icon={<ServerIcon size={14} />}
              title={"Deploy a new proxy"}
              detail={"On your own infrastructure"}
              onClick={onSelfDeploy}
              data-testid={"gateway-choice-self-deploy"}
            />
          </div>
        )}
      </div>
    </StepLayout>
  );
};

const OWN_PROXY_OPTIONS_ID = "gateway-own-proxy-options";

const connectedProxies = (count: number) =>
  `${count} ${count === 1 ? "proxy" : "proxies"} connected`;

const privateProxies = (count: number) =>
  `${count} private ${count === 1 ? "proxy" : "proxies"}`;

const OwnProxyToggle = ({
  open,
  privateCount,
  onToggle,
}: {
  open: boolean;
  privateCount: number;
  onToggle: () => void;
}) => (
  <button
    type={"button"}
    onClick={onToggle}
    aria-expanded={open}
    aria-controls={OWN_PROXY_OPTIONS_ID}
    data-testid={"gateway-choice-own-proxy"}
    className={
      "self-center flex items-center gap-1.5 mt-1 text-sm text-nb-gray-400 hover:text-nb-gray-200 transition-colors"
    }
  >
    Use your own proxy instead
    {privateCount > 0 && !open && (
      <span className={"text-nb-gray-500"}>
        · {privateProxies(privateCount)}
      </span>
    )}
    <ChevronDownIcon
      size={14}
      className={cn("transition-transform", open && "rotate-180")}
    />
  </button>
);

const OptionRow = ({
  icon,
  title,
  detail,
  onClick,
  "data-testid": dataTestId,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  "data-testid"?: string;
}) => (
  <button
    type={"button"}
    onClick={onClick}
    data-testid={dataTestId}
    className={
      "w-full text-left flex items-center gap-3 px-4 py-2.5 bg-nb-gray-920/40 hover:bg-nb-gray-910 transition-colors"
    }
  >
    <span className={"text-nb-gray-400 shrink-0"}>{icon}</span>
    <span
      className={
        "flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-x-3 gap-y-0.5"
      }
    >
      <span className={"min-w-0 text-sm text-nb-gray-100 break-words"}>
        {title}
      </span>
      <span className={"text-xs text-nb-gray-400 shrink-0"}>{detail}</span>
    </span>
    <ArrowRightIcon size={14} className={"text-nb-gray-500 shrink-0"} />
  </button>
);

const ChoiceCard = ({
  icon,
  title,
  badge,
  description,
  onClick,
  "data-testid": dataTestId,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  onClick: () => void;
  "data-testid"?: string;
}) => (
  <button
    type={"button"}
    onClick={onClick}
    data-testid={dataTestId}
    className={
      "w-full text-left flex gap-3 items-center rounded-lg border border-nb-gray-900 bg-nb-gray-920 hover:bg-nb-gray-910 hover:border-nb-gray-800 transition-colors p-4"
    }
  >
    <SquareIcon color={"netbird"} margin={""} icon={icon} />
    <div className={"flex-1 min-w-0"}>
      <div className={"text-sm flex flex-wrap items-center gap-x-2 gap-y-1"}>
        <span className={"min-w-0 break-words"}>{title}</span>
        {badge && (
          <Badge variant={"netbird"} size={"xs"}>
            {badge}
          </Badge>
        )}
      </div>
      <div className={"text-[0.8rem] text-nb-gray-300 font-light mt-1"}>
        {description}
      </div>
    </div>
    <ArrowRightIcon size={16} className={"text-nb-gray-400 shrink-0"} />
  </button>
);

type ManagedProps = {
  proxy?: AgentNetworkManagedProxy;
  posting: boolean;
  failure: ProvisionFailure | null;
  retries: number;
  onRetry: () => void;
  onSelfDeploy: () => void;
  onBack: () => void;
  onNext: () => void;
};

const ManagedGateway = ({
  proxy,
  posting,
  failure,
  retries,
  onRetry,
  onSelfDeploy,
  onBack,
  onNext,
}: ManagedProps) => {
  const { mutate } = useSWRConfig();
  const { settings } = useAIProviders();
  const state = proxy?.state;
  const ready = state === MANAGED_PROXY_STATE.READY;
  const provisioning = state === MANAGED_PROXY_STATE.PROVISIONING;
  const failed = state === MANAGED_PROXY_STATE.FAILED;
  const unknown = !!proxy && !isKnownManagedProxyState(proxy.state);
  const elapsed = useStopwatch(provisioning, retries);
  const stages = managedGatewayStages(state);

  // The managed POST writes the settings row itself; reading it again at ready
  // hands the endpoint to the steps that follow, and Continue waits for that
  // read so the provider step never sees an account without settings.
  useEffect(() => {
    if (ready) mutate("/agent-network/settings");
  }, [ready, mutate]);

  const header = managedHeader(proxy, !!failure);
  // A failed POST matters until the deployment moves on without it.
  const showFailure = !!failure && (!proxy || failed);

  return (
    <StepLayout
      title={header.title}
      aside={provisioning ? `Elapsed ${formatElapsed(elapsed)}` : undefined}
      description={header.description}
      onBack={onBack}
      onNext={onNext}
      canContinue={ready && !!settings?.endpoint}
    >
      <LiveStatus
        message={header.announcement}
        data-testid={"gateway-managed-status"}
        data-state={state ?? "pending"}
      />
      {proxy && (
        <div className={"mt-2 flex flex-col items-center gap-4"}>
          {provisioning && (
            <Badge variant={"netbird"}>
              <Loader2Icon size={12} className={"animate-spin"} />
              Your gateway is being prepared…
            </Badge>
          )}
          {unknown && <Badge variant={"gray"}>Unknown status</Badge>}
          <EndpointBadge endpoint={proxy.endpoint} />
        </div>
      )}

      {!(failure && !proxy) && (
        <ul className={"mt-2 flex flex-col gap-2.5 self-center"}>
          <StageRow status={stages.reserve}>
            Reserving your gateway address
          </StageRow>
          <StageRow status={stages.deploy}>Deploying your gateway</StageRow>
          <StageRow status={stages.connect}>
            Connecting to your network
          </StageRow>
        </ul>
      )}

      {provisioning && elapsed >= MANAGED_SLOW_HINT_AFTER_S && (
        <Callout variant={"info"} data-testid={"gateway-slow-hint"}>
          This is taking longer than usual. We&apos;ll keep checking. You can
          stay on this page or skip to the dashboard and come back.
        </Callout>
      )}

      {ready && (
        <Callout
          variant={"success"}
          icon={
            <CheckCircle2Icon
              size={14}
              className={"shrink-0 relative top-[3px]"}
            />
          }
        >
          Your gateway is serving your endpoint. Connect a provider next so it
          has somewhere to route requests.
        </Callout>
      )}

      {failed && (
        <Callout variant={"warning"} data-testid={"gateway-failed-message"}>
          {proxy?.message || "The gateway rollout reported a failure."}
        </Callout>
      )}

      {showFailure && <FailureCallout failure={failure} />}

      {(failed || showFailure) && (
        <div className={"flex items-center justify-center gap-4"}>
          {failure?.kind !== "forbidden" && (
            <Button
              variant={"secondary"}
              size={"xs"}
              onClick={onRetry}
              disabled={posting}
              data-testid={"gateway-retry"}
            >
              {posting ? (
                <Loader2Icon size={14} className={"animate-spin"} />
              ) : (
                <RefreshCwIcon size={14} />
              )}
              Retry
            </Button>
          )}
          <InlineButtonLink
            type={"button"}
            className={"text-sm"}
            onClick={onSelfDeploy}
            data-testid={"gateway-self-deploy-instead"}
          >
            Deploy my own proxy instead
          </InlineButtonLink>
        </div>
      )}
    </StepLayout>
  );
};

function managedHeader(
  proxy: AgentNetworkManagedProxy | undefined,
  hasFailure: boolean,
): { title: string; description?: string; announcement: string } {
  const preparing = {
    title: "Setting up your managed gateway…",
    description: proxy
      ? "This usually takes under a minute. You can copy your endpoint now."
      : "This usually takes under a minute.",
    announcement: "Setting up your managed gateway",
  };
  const problem = {
    title: "Gateway setup ran into a problem",
    announcement: "Gateway setup ran into a problem",
  };
  if (!proxy) return hasFailure ? problem : preparing;
  switch (proxy.state) {
    case MANAGED_PROXY_STATE.PROVISIONING:
      return preparing;
    case MANAGED_PROXY_STATE.READY:
      return { title: "Your gateway is ready", announcement: "Gateway ready" };
    case MANAGED_PROXY_STATE.FAILED:
      return problem;
    default:
      return {
        title: "Checking gateway status…",
        description:
          "The gateway reported a status this page doesn't know yet. We'll keep checking.",
        announcement: "Checking gateway status",
      };
  }
}

const FailureCallout = ({ failure }: { failure: ProvisionFailure }) => {
  switch (failure.kind) {
    case "unavailable":
      return (
        <Callout variant={"warning"} data-testid={"gateway-unavailable"}>
          Managed gateways are temporarily unavailable. Try again shortly.
        </Callout>
      );
    case "forbidden":
      return (
        <Callout variant={"error"} data-testid={"gateway-forbidden"}>
          Setting up a managed gateway needs the Agent Network create
          permission. Ask an account owner to grant it.
        </Callout>
      );
    default:
      return (
        <Callout variant={"error"} data-testid={"gateway-error"}>
          {failure.message}
        </Callout>
      );
  }
};

type SelfDeployProps = {
  // Set when the managed-proxy POST answered 404: no provisioner exists, so
  // deploying a proxy is the only way on.
  managedUnavailable: boolean;
  // Leaves the self-deploy view from its first tab.
  onExit: () => void;
  onNext: () => void;
};

const SelfDeployGateway = ({
  managedUnavailable,
  onExit,
  onNext,
}: SelfDeployProps) => {
  const setup = useClusterSetup();
  const watching = setup.tab === "install" && setup.canAdvance;
  const cluster = useProxyCluster(watching ? setup.domain : undefined, {
    done: (c) => selfDeployPhase(c) === "connected",
  });
  const phase = selfDeployPhase(cluster);
  const connected = phase === "connected";
  const bootstrap = useGatewayBootstrap(
    connected ? cluster?.address : undefined,
  );
  const registering = watching && (phase === "waiting" || phase === "found");
  const elapsed = useStopwatch(registering, setup.domain);
  const onInstallTab = setup.tab === "install";
  // The settings endpoint is immutable, so one the account already holds
  // beneath another address (a managed gateway's, say) stays there and this
  // proxy cannot take it over.
  const reservedElsewhere =
    !!bootstrap.endpoint && !sameHost(bootstrap.proxyAddress, setup.domain);

  const status = (
    <SelfDeployStatus
      phase={phase}
      bootstrap={bootstrap}
      reservedElsewhere={reservedElsewhere}
      elapsed={elapsed}
      showHint={registering && elapsed >= SELF_DEPLOY_HINT_AFTER_S}
      managementUrl={setup.managementUrl}
    />
  );

  return (
    <StepLayout
      title={"Deploy your own proxy"}
      description={
        "Run the NetBird proxy on your own infrastructure. It serves Agent Network privately to the devices on your network."
      }
      onBack={setup.tab === "domain" ? onExit : setup.back}
      onNext={onInstallTab ? onNext : setup.next}
      canContinue={
        onInstallTab ? connected && !!bootstrap.endpoint : setup.canAdvance
      }
    >
      {managedUnavailable && (
        <Callout variant={"info"}>
          Managed gateways aren&apos;t available for this account, so the
          gateway runs on a proxy you deploy.
        </Callout>
      )}
      {reservedElsewhere && (
        <Callout variant={"warning"} data-testid={"gateway-reserved-elsewhere"}>
          This account&apos;s gateway address is already reserved as{" "}
          <span className={"font-mono text-white"}>{bootstrap.endpoint}</span>,
          and a proxy you deploy here won&apos;t serve it.
        </Callout>
      )}
      <ClusterSetupContent setup={setup} inline registrationStatus={status} />
    </StepLayout>
  );
};

type SelfDeployStatusProps = {
  phase: SelfDeployPhase;
  bootstrap: GatewayBootstrap;
  reservedElsewhere: boolean;
  elapsed: number;
  showHint: boolean;
  managementUrl: string;
};

const SelfDeployStatus = ({
  phase,
  bootstrap,
  reservedElsewhere,
  elapsed,
  showHint,
  managementUrl,
}: SelfDeployStatusProps) => (
  <div
    className={"flex flex-col gap-3"}
    data-testid={"gateway-self-deploy-status"}
    data-phase={phase}
  >
    <LiveStatus message={selfDeployAnnouncement(phase, bootstrap)} />
    {phase === "waiting" && (
      <StatusLine status={"active"} aside={`Elapsed ${formatElapsed(elapsed)}`}>
        Waiting for your proxy to connect to NetBird…
      </StatusLine>
    )}
    {phase === "found" && (
      <StatusLine status={"active"} aside={`Elapsed ${formatElapsed(elapsed)}`}>
        Proxy found, waiting for it to come online…
      </StatusLine>
    )}
    {phase === "not-private" && (
      <Callout variant={"warning"} data-testid={"gateway-not-private"}>
        This proxy isn&apos;t private-capable. Agent Network needs a private
        proxy (<span className={"font-mono"}>NB_PROXY_PRIVATE=true</span>).
        Redeploy it with the flag and this page picks it up.
      </Callout>
    )}
    {phase === "connected" && (
      <>
        <StatusLine status={"done"}>Proxy connected</StatusLine>
        {!reservedElsewhere && <GatewayAddressStatus bootstrap={bootstrap} />}
      </>
    )}
    {showHint && (
      <Callout variant={"info"} data-testid={"gateway-slow-hint"}>
        Still waiting. Check that the proxy container is running and can reach{" "}
        <span className={"font-mono text-white"}>{managementUrl}</span>.{" "}
        <InlineLink href={REVERSE_PROXY_CLUSTERS_DOCS_LINK} target={"_blank"}>
          Proxy cluster docs
          <ExternalLinkIcon size={12} />
        </InlineLink>
      </Callout>
    )}
  </div>
);

function selfDeployAnnouncement(
  phase: SelfDeployPhase,
  bootstrap: GatewayBootstrap,
): string {
  if (phase === "connected") {
    if (bootstrap.status === "ready") return "Gateway ready";
    if (bootstrap.status === "failed") return "Reserving the address failed";
    return "Proxy connected, reserving your gateway address";
  }
  if (phase === "not-private") return "This proxy isn't private-capable";
  if (phase === "found") return "Proxy found, waiting for it to come online";
  return "Waiting for your proxy to connect";
}

type PrivateClusterProps = {
  address: string;
  onBack: () => void;
  onNext: () => void;
};

// PrivateClusterGateway serves the endpoint from a private proxy the account
// already runs, picked on the choice screen: the endpoint is reserved beneath
// it and no managed gateway is involved.
const PrivateClusterGateway = ({
  address,
  onBack,
  onNext,
}: PrivateClusterProps) => {
  const bootstrap = useGatewayBootstrap(address);
  const ready = bootstrap.status === "ready";

  return (
    <StepLayout
      title={ready ? "Your gateway is ready" : "Setting up your gateway"}
      description={
        <>
          Agent Network is served from your private proxy at{" "}
          <span className={"font-mono text-nb-gray-100"}>{address}</span>.
        </>
      }
      onBack={onBack}
      onNext={onNext}
      canContinue={ready}
    >
      <LiveStatus
        message={ready ? "Gateway ready" : "Reserving your gateway address"}
      />
      <div
        className={"mt-2 flex flex-col gap-3 items-center"}
        data-testid={"gateway-private-cluster"}
      >
        <GatewayAddressStatus bootstrap={bootstrap} />
      </div>
    </StepLayout>
  );
};

// GatewayAddressStatus follows the settings bootstrap: reserving the address,
// then the endpoint once the settings carry it, or the failure with a retry.
const GatewayAddressStatus = ({
  bootstrap,
}: {
  bootstrap: GatewayBootstrap;
}) => {
  if (bootstrap.status === "failed") {
    return (
      <Callout variant={"error"} data-testid={"gateway-bootstrap-error"}>
        Reserving your gateway address failed.
        <Button
          variant={"secondary"}
          size={"xs"}
          className={"mt-2"}
          onClick={bootstrap.retry}
        >
          <RefreshCwIcon size={14} />
          Retry
        </Button>
      </Callout>
    );
  }
  if (bootstrap.status === "ready" && bootstrap.endpoint) {
    return (
      <>
        <StatusLine status={"done"}>Your gateway is ready</StatusLine>
        <EndpointBadge endpoint={bootstrap.endpoint} />
      </>
    );
  }
  return (
    <StatusLine status={"active"}>Reserving your gateway address…</StatusLine>
  );
};

type GatewayBootstrap = ReturnType<typeof useGatewayBootstrap>;

const SETTINGS_POLL_MS = 3_000;

// useGatewayBootstrap reserves the account's endpoint beneath a proxy cluster
// address, once per address or retry, and reports when the settings carry it.
// With no address, or an endpoint already assigned, it sends nothing.
function useGatewayBootstrap(address: string | undefined) {
  const { settings, bootstrapAgentNetworkSettings } = useAIProviders();
  const { mutate } = useSWRConfig();
  const endpoint = settings?.endpoint;
  const [result, setResult] = useState<{ address: string; ok: boolean }>();
  const [attempt, setAttempt] = useState(0);
  // The provider hands out a new callback on every render; the POST has to
  // follow the address and the retries, not the renders.
  const bootstrap = useRef(bootstrapAgentNetworkSettings);
  useEffect(() => {
    bootstrap.current = bootstrapAgentNetworkSettings;
  });

  useEffect(() => {
    if (!address || endpoint) return;
    let cancelled = false;
    bootstrap.current(address).then((ok) => {
      if (!cancelled) setResult({ address, ok });
    });
    return () => {
      cancelled = true;
    };
  }, [address, endpoint, attempt]);

  const settled = result?.address === address ? result : undefined;
  // The POST succeeded, so the row exists; read it until it shows the
  // endpoint.
  const awaitingEndpoint = !endpoint && settled?.ok === true;
  useEffect(() => {
    if (!awaitingEndpoint) return;
    const timer = setInterval(
      () => mutate("/agent-network/settings"),
      SETTINGS_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [awaitingEndpoint, mutate]);

  let status: "idle" | "running" | "failed" | "ready" = "idle";
  if (endpoint) status = "ready";
  else if (address) status = settled?.ok === false ? "failed" : "running";

  return {
    status,
    endpoint,
    // The cluster address the endpoint hangs beneath.
    proxyAddress: settings?.proxyAddress ?? "",
    retry: () => {
      setResult(undefined);
      setAttempt((n) => n + 1);
    },
  };
}

const sameHost = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// useStopwatch counts whole seconds while running. Stopping keeps the start,
// so the count carries on if it runs again; a new resetKey starts over.
function useStopwatch(running: boolean, resetKey: string | number): number {
  const [clock, setClock] = useState<{
    key: string | number;
    start: number;
    now: number;
  }>();

  useEffect(() => {
    if (!running) return;
    const tick = () =>
      setClock((c) => {
        const now = Date.now();
        return c?.key === resetKey
          ? { ...c, now }
          : { key: resetKey, start: now, now };
      });
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [running, resetKey]);

  if (!clock || clock.key !== resetKey) return 0;
  return Math.floor((clock.now - clock.start) / 1_000);
}

type StepLayoutProps = {
  title: string;
  // Muted text beside the title, e.g. the elapsed time.
  aside?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
};

const StepLayout = ({
  title,
  aside,
  description,
  children,
  onBack,
  onNext,
  canContinue,
}: StepLayoutProps) => (
  <div
    className={"relative flex flex-col h-full gap-4"}
    data-testid={"agent-network-gateway-step"}
  >
    <div>
      <h1 className={"text-xl text-center"}>
        {title}
        {aside && (
          <span
            className={"ml-2 text-sm font-light text-nb-gray-400 tabular-nums"}
          >
            {aside}
          </span>
        )}
      </h1>
      {description && (
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {description}
        </div>
      )}
    </div>

    {children}

    <div className={"flex items-center justify-center mt-4 gap-3"}>
      <Button variant={"secondary"} onClick={onBack}>
        Go Back
      </Button>
      <Button
        variant={"primary"}
        disabled={!canContinue}
        onClick={onNext}
        data-testid={"gateway-continue"}
      >
        Continue
        <ArrowRightIcon size={16} />
      </Button>
    </div>
  </div>
);

const STAGE_ICON: Record<StageStatus, React.ReactNode> = {
  done: <CheckCircle2Icon size={16} className={"text-green-500"} />,
  active: <Loader2Icon size={16} className={"animate-spin text-nb-gray-300"} />,
  pending: <CircleIcon size={16} className={"text-nb-gray-700"} />,
  failed: <AlertCircleIcon size={16} className={"text-red-500"} />,
};

const StageRow = ({
  status,
  children,
}: {
  status: StageStatus;
  children: React.ReactNode;
}) => (
  <li
    className={cn(
      "flex items-center gap-2.5 text-sm",
      status === "pending" ? "text-nb-gray-400" : "text-nb-gray-100",
    )}
    data-status={status}
  >
    {/* Keyed by status so a change fades the new icon in. */}
    <span
      key={status}
      className={"inline-flex animate-in fade-in duration-300"}
    >
      {STAGE_ICON[status]}
    </span>
    {children}
  </li>
);

const StatusLine = ({
  status,
  aside,
  children,
}: {
  status: "active" | "done";
  aside?: string;
  children: React.ReactNode;
}) => (
  <div
    className={
      "flex items-center gap-2 text-sm animate-in fade-in duration-300"
    }
  >
    {status === "done" ? (
      <CheckCircle2Icon size={16} className={"text-green-500 shrink-0"} />
    ) : (
      <Loader2Icon
        size={16}
        className={"animate-spin text-nb-gray-300 shrink-0"}
      />
    )}
    <span
      className={status === "done" ? "text-nb-gray-100" : "text-nb-gray-300"}
    >
      {children}
    </span>
    {aside && (
      <span className={"text-xs text-nb-gray-400 tabular-nums"}>{aside}</span>
    )}
  </div>
);

// LiveStatus announces state changes to screen readers without showing
// anything on screen.
const LiveStatus = ({
  message,
  ...props
}: {
  message: string;
  "data-testid"?: string;
  "data-state"?: string;
}) => (
  <div className={"sr-only"} role={"status"} aria-live={"polite"} {...props}>
    {message}
  </div>
);
