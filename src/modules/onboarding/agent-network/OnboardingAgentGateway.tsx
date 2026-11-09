import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import { notify } from "@components/Notification";
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
import {
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  ReverseProxyCluster,
} from "@/interfaces/ReverseProxy";
import type { AgentNetworkManagedProxy } from "@/modules/agent-network/AIProvidersProvider";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  MANAGED_PROXY_STATE,
  ProvisionOutcome,
} from "@/modules/agent-network/managedProxyState";
import { useManagedProxy } from "@/modules/agent-network/useManagedProxy";
import {
  MANAGED_SLOW_HINT_AFTER_S,
  managedGatewayStages,
  privateAccountClusters,
  resolveGatewayEntry,
  SELF_DEPLOY_HINT_AFTER_S,
  SelfDeployPhase,
  selfDeployPhase,
  StageStatus,
} from "@/modules/onboarding/agent-network/gatewayFlow";
import { IntentCard } from "@/modules/onboarding/OnboardingIntent";
import { ClustersModal } from "@/modules/reverse-proxy/clusters/ClustersModal";
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
  | { kind: "new-proxy"; domain: string }
  | { kind: "private-cluster"; address: string };

// A managed-proxy POST that left nothing to show but the reason.
type ProvisionFailure = Extract<
  ProvisionOutcome,
  { kind: "unavailable" | "forbidden" | "error" }
>;

const GATEWAY_ALREADY_SET_UP = {
  title: "Your proxy is already set up",
  description: "This account already has an Agent Network endpoint.",
};

// OnboardingAgentGateway sets up the gateway the account's endpoint is served
// from, before any provider is connected: a NetBird-managed gateway, a private
// proxy the account already runs, or a new proxy the operator deploys. The
// step offers Continue once the gateway is ready, as the device step does once
// the device connects, and an account that already has one skips it.
export const OnboardingAgentGateway = ({ onBack, onNext, onSkip }: Props) => {
  const { settings, settingsLoading } = useAIProviders();
  const managed = useManagedProxy(true);
  const { data: clusters, isLoading: clustersLoading } = useFetchApi<
    ReverseProxyCluster[]
  >("/reverse-proxies/clusters", true);
  const { mutate } = useSWRConfig();
  const privateClusters = privateAccountClusters(clusters);

  // The clusters are part of the wait so the choice opens with every proxy the
  // account can pick already listed.
  const entry = resolveGatewayEntry({
    loading: settingsLoading || managed.isLoading || clustersLoading,
    managedExists: !!managed.proxy,
    managedReady: managed.proxy?.state === MANAGED_PROXY_STATE.READY,
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
  const [clustersModalOpen, setClustersModalOpen] = useState(false);

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
        // The provider step needs the settings row the endpoint lives in.
        // Nothing was set up here to show, so the flow moves on at once.
        await mutate("/agent-network/settings");
        notify(GATEWAY_ALREADY_SET_UP);
        onNext();
        return;
      case "not-configured":
        setManagedHidden(true);
        setView({ kind: "choice" });
        return;
      default:
        setFailure(outcome);
    }
  };

  const retry = () => {
    setRetries((n) => n + 1);
    provision();
  };

  const deployNewProxy = () => setClustersModalOpen(true);
  const backToChoice = () => setView({ kind: "choice" });

  if (!view) {
    return (
      <StepLayout title={"Set up your proxy"} onBack={onBack}>
        <div className={"mt-4 flex justify-center"}>
          <StatusLine status={"active"}>Checking your proxy…</StatusLine>
        </div>
      </StepLayout>
    );
  }

  return (
    <>
      {view.kind === "choice" && (
        <GatewayChoice
          managedAvailable={!managedHidden}
          privateClusters={privateClusters}
          onManaged={provision}
          onPrivateCluster={(address) =>
            setView({ kind: "private-cluster", address })
          }
          onNewProxy={deployNewProxy}
          onBack={onBack}
        />
      )}
      {view.kind === "managed" && (
        <ManagedGateway
          proxy={managed.proxy}
          posting={posting}
          failure={failure}
          retries={retries}
          onRetry={retry}
          onNewProxy={deployNewProxy}
          onBack={onBack}
          onNext={onNext}
        />
      )}
      {view.kind === "new-proxy" && (
        <NewProxyGateway
          domain={view.domain}
          onBack={backToChoice}
          onNext={onNext}
        />
      )}
      {view.kind === "private-cluster" && (
        <PrivateClusterGateway
          address={view.address}
          onBack={backToChoice}
          onNext={onNext}
        />
      )}
      <ClustersModal
        open={clustersModalOpen}
        onOpenChange={setClustersModalOpen}
        onFinish={(domain) => setView({ kind: "new-proxy", domain })}
        key={clustersModalOpen ? 1 : 0}
      />
    </>
  );
};

type ChoiceProps = {
  managedAvailable: boolean;
  privateClusters: ReverseProxyCluster[];
  onManaged: () => void;
  onPrivateCluster: (address: string) => void;
  onNewProxy: () => void;
  onBack: () => void;
};

const GatewayChoice = ({
  managedAvailable,
  privateClusters,
  onManaged,
  onPrivateCluster,
  onNewProxy,
  onBack,
}: ChoiceProps) => {
  // The managed gateway leads; a proxy of the account's own waits behind a
  // link, unless it is the only way on.
  const [ownProxyOpen, setOwnProxyOpen] = useState(false);

  return (
    <StepLayout
      title={"Set up your proxy"}
      description={
        "Your agents talk to providers through a private proxy that only your network can access. Use a managed proxy or your own."
      }
      onBack={onBack}
    >
      <div className={"mt-2 flex flex-col gap-3"}>
        {managedAvailable ? (
          <div
            className={
              "grid grid-cols-1 border border-nb-gray-900 rounded-lg bg-nb-gray-930/60 overflow-hidden"
            }
          >
            <IntentCard
              title={"Managed proxy"}
              description={
                "NetBird runs a dedicated, private proxy for your account."
              }
              icon={<CloudIcon size={18} className={"text-nb-gray-400"} />}
              onClick={onManaged}
              data-testid={"gateway-choice-managed"}
            />
          </div>
        ) : (
          <Callout variant={"info"} data-testid={"gateway-managed-unavailable"}>
            Managed proxies aren&apos;t available for this account, so Agent
            Network runs on a proxy of your own.
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
              onClick={onNewProxy}
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
    Or use your own proxy instead
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

type ManagedProps = {
  proxy?: AgentNetworkManagedProxy;
  posting: boolean;
  failure: ProvisionFailure | null;
  retries: number;
  onRetry: () => void;
  onNewProxy: () => void;
  onBack: () => void;
  onNext: () => void;
};

const ManagedGateway = ({
  proxy,
  posting,
  failure,
  retries,
  onRetry,
  onNewProxy,
  onBack,
  onNext,
}: ManagedProps) => {
  const { mutate } = useSWRConfig();
  const { settings } = useAIProviders();
  const state = proxy?.state;
  const ready = state === MANAGED_PROXY_STATE.READY;
  const provisioning = state === MANAGED_PROXY_STATE.PROVISIONING;
  const failed = state === MANAGED_PROXY_STATE.FAILED;
  const elapsed = useStopwatch(provisioning, retries);
  const stages = managedGatewayStages(state);

  // The managed POST writes the settings row itself; reading it again at ready
  // hands the endpoint to the steps that follow, and Continue waits for that
  // read so the provider step never sees an account without settings.
  useEffect(() => {
    if (ready) mutate("/agent-network/settings");
  }, [ready, mutate]);
  const done = ready && !!settings?.endpoint;

  const header = managedHeader(proxy, !!failure, done);
  // A failed POST matters until the deployment moves on without it.
  const showFailure = !!failure && (!proxy || failed);

  return (
    <StepLayout
      title={header.title}
      description={header.description}
      onBack={onBack}
      onNext={done ? onNext : undefined}
    >
      <LiveStatus
        message={header.announcement}
        data-testid={"gateway-managed-status"}
        data-state={state ?? "pending"}
      />

      {!(failure && !proxy) && (
        <ul className={"mt-2 flex flex-col gap-2.5 self-center"}>
          <StageRow status={stages.reserve}>Reserving your endpoint</StageRow>
          <StageRow status={stages.deploy}>Deploying your proxy</StageRow>
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

      {failed && (
        <Callout variant={"warning"} data-testid={"gateway-failed-message"}>
          {proxy?.message || "The proxy rollout reported a failure."}
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
            onClick={onNewProxy}
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
  done: boolean,
): { title: string; description?: string; announcement: string } {
  const preparing = {
    title: "Setting up your managed proxy…",
    description: "This usually takes under a minute.",
    announcement: "Setting up your managed proxy",
  };
  const problem = {
    title: "Proxy setup ran into a problem",
    announcement: "Proxy setup ran into a problem",
  };
  if (!proxy) return hasFailure ? problem : preparing;
  switch (proxy.state) {
    case MANAGED_PROXY_STATE.PROVISIONING:
      return preparing;
    // Finishing up while the settings are read again, before Continue.
    case MANAGED_PROXY_STATE.READY:
      return done
        ? {
            title: "Your managed proxy is ready",
            description: "Thanks for waiting.",
            announcement: "Proxy ready",
          }
        : { title: "Finishing up…", announcement: "Finishing up" };
    case MANAGED_PROXY_STATE.FAILED:
      return problem;
    default:
      return {
        title: "Checking proxy status…",
        description:
          "The proxy reported a status this page doesn't know yet. We'll keep checking.",
        announcement: "Checking proxy status",
      };
  }
}

const FailureCallout = ({ failure }: { failure: ProvisionFailure }) => {
  switch (failure.kind) {
    case "unavailable":
      return (
        <Callout variant={"warning"} data-testid={"gateway-unavailable"}>
          Managed proxies are temporarily unavailable. Try again shortly.
        </Callout>
      );
    case "forbidden":
      return (
        <Callout variant={"error"} data-testid={"gateway-forbidden"}>
          Setting up a managed proxy needs the Agent Network create permission.
          Ask an account owner to grant it.
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

type OwnProxyProps = {
  onBack: () => void;
  // onNext is offered once the endpoint is reserved beneath this proxy, or
  // when it turns out to be reserved beneath another address, which the step
  // cannot fix.
  onNext: () => void;
};

// NewProxyGateway waits for the proxy set up in the clusters modal to connect,
// then reserves the account's endpoint beneath it.
const NewProxyGateway = ({
  domain,
  onBack,
  onNext,
}: OwnProxyProps & { domain: string }) => {
  const cluster = useProxyCluster(domain, {
    done: (c) => selfDeployPhase(c) === "connected",
  });
  const phase = selfDeployPhase(cluster);
  const connected = phase === "connected";
  const bootstrap = useGatewayBootstrap(
    connected ? cluster?.address : undefined,
  );
  const registering = phase === "waiting" || phase === "found";
  const elapsed = useStopwatch(registering, domain);
  const reservedElsewhere = isReservedElsewhere(bootstrap, domain);
  const done = connected && bootstrap.status === "ready" && !reservedElsewhere;

  return (
    <StepLayout
      title={done ? "Your proxy is connected" : "Connecting your proxy"}
      description={
        <>
          Agent Network is served from your proxy at{" "}
          <span className={"font-mono text-nb-gray-100"}>{domain}</span> once it
          connects to NetBird.
        </>
      }
      onBack={onBack}
      onNext={done || reservedElsewhere ? onNext : undefined}
    >
      {reservedElsewhere && <ReservedElsewhere endpoint={bootstrap.endpoint} />}
      <SelfDeployStatus
        phase={phase}
        bootstrap={bootstrap}
        reservedElsewhere={reservedElsewhere}
        showHint={registering && elapsed >= SELF_DEPLOY_HINT_AFTER_S}
      />
    </StepLayout>
  );
};

type SelfDeployStatusProps = {
  phase: SelfDeployPhase;
  bootstrap: GatewayBootstrap;
  reservedElsewhere: boolean;
  showHint: boolean;
};

const SelfDeployStatus = ({
  phase,
  bootstrap,
  reservedElsewhere,
  showHint,
}: SelfDeployStatusProps) => (
  <div
    className={"mt-2 flex flex-col gap-3 items-center"}
    data-testid={"gateway-self-deploy-status"}
    data-phase={phase}
  >
    <LiveStatus message={selfDeployAnnouncement(phase, bootstrap)} />
    {phase === "waiting" && (
      <StatusLine status={"active"}>
        Waiting for your proxy to connect to NetBird…
      </StatusLine>
    )}
    {phase === "found" && (
      <StatusLine status={"active"}>
        Proxy found, waiting for it to come online…
      </StatusLine>
    )}
    {phase === "not-private" && (
      <Callout
        variant={"warning"}
        className={"w-full"}
        data-testid={"gateway-not-private"}
      >
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
      <Callout
        variant={"info"}
        className={"w-full"}
        data-testid={"gateway-slow-hint"}
      >
        Still waiting. Check that the proxy container is running and can reach
        the address in{" "}
        <span className={"font-mono text-white"}>
          NB_PROXY_MANAGEMENT_ADDRESS
        </span>
        .{" "}
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
    if (bootstrap.status === "ready") return "Proxy ready";
    if (bootstrap.status === "failed") return "Reserving the endpoint failed";
    return "Proxy connected, reserving your endpoint";
  }
  if (phase === "not-private") return "This proxy isn't private-capable";
  if (phase === "found") return "Proxy found, waiting for it to come online";
  return "Waiting for your proxy to connect";
}

// PrivateClusterGateway serves the endpoint from a private proxy the account
// already runs, picked on the choice screen: the endpoint is reserved beneath
// it and no managed gateway is involved.
const PrivateClusterGateway = ({
  address,
  onBack,
  onNext,
}: OwnProxyProps & { address: string }) => {
  const bootstrap = useGatewayBootstrap(address);
  const reservedElsewhere = isReservedElsewhere(bootstrap, address);
  const done = bootstrap.status === "ready" && !reservedElsewhere;

  return (
    <StepLayout
      title={done ? "Your proxy is ready" : "Setting up your proxy"}
      description={
        <>
          Agent Network is served from your private proxy at{" "}
          <span className={"font-mono text-nb-gray-100"}>{address}</span>.
        </>
      }
      onBack={onBack}
      onNext={done || reservedElsewhere ? onNext : undefined}
    >
      <LiveStatus
        message={
          bootstrap.status === "ready"
            ? "Proxy ready"
            : "Reserving your endpoint"
        }
      />
      {reservedElsewhere ? (
        <ReservedElsewhere endpoint={bootstrap.endpoint} />
      ) : (
        <div
          className={"mt-2 flex flex-col gap-3 items-center"}
          data-testid={"gateway-private-cluster"}
        >
          <GatewayAddressStatus bootstrap={bootstrap} />
        </div>
      )}
    </StepLayout>
  );
};

// The settings endpoint is immutable, so one the account already holds
// beneath another address (a managed gateway's, say) stays there and the
// proxy picked here cannot take it over.
const isReservedElsewhere = (bootstrap: GatewayBootstrap, address: string) =>
  !!bootstrap.endpoint && !sameHost(bootstrap.proxyAddress, address);

const ReservedElsewhere = ({ endpoint }: { endpoint?: string }) => (
  <Callout variant={"warning"} data-testid={"gateway-reserved-elsewhere"}>
    This account&apos;s endpoint is already reserved as{" "}
    <span className={"font-mono text-white"}>{endpoint}</span>, and this proxy
    won&apos;t serve it.
  </Callout>
);

// GatewayAddressStatus follows the settings bootstrap: reserving the address
// until the settings carry the endpoint, or the failure with a retry.
const GatewayAddressStatus = ({
  bootstrap,
}: {
  bootstrap: GatewayBootstrap;
}) => {
  if (bootstrap.status === "failed") {
    return (
      <Callout
        variant={"error"}
        className={"w-full"}
        data-testid={"gateway-bootstrap-error"}
      >
        Reserving your endpoint failed.
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
  if (bootstrap.status === "ready") {
    return <StatusLine status={"done"}>Endpoint reserved</StatusLine>;
  }
  return <StatusLine status={"active"}>Reserving your endpoint…</StatusLine>;
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
    bootstrap
      .current(address)
      // A rejected settings read after the POST counts as a failure to retry.
      .catch(() => false)
      .then((ok) => {
        if (!cancelled) setResult({ address, ok: !!ok });
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
  description?: React.ReactNode;
  children: React.ReactNode;
  onBack: () => void;
  // onNext adds a Continue button, once there is somewhere to go on to.
  onNext?: () => void;
};

const StepLayout = ({
  title,
  description,
  children,
  onBack,
  onNext,
}: StepLayoutProps) => (
  <div
    className={"relative flex flex-col h-full gap-4"}
    data-testid={"agent-network-gateway-step"}
  >
    <div>
      <h1 className={"text-xl text-center"}>{title}</h1>
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
      {onNext && (
        <Button
          variant={"primary"}
          onClick={onNext}
          data-testid={"gateway-continue"}
        >
          Continue
          <ArrowRightIcon size={16} />
        </Button>
      )}
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
  children,
}: {
  status: "active" | "done";
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
