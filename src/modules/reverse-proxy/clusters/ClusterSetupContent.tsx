import { Callout } from "@components/Callout";
import CardTable from "@components/CardTable";
import Code from "@components/Code";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { cn, validator } from "@utils/helpers";
import {
  ExternalLinkIcon,
  GlobeIcon,
  ListIcon,
  Loader2,
  SquareTerminalIcon,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import AWSIcon from "@/assets/icons/AWSIcon";
import DigitalOceanIcon from "@/assets/icons/DigitalOceanIcon";
import DockerIcon from "@/assets/icons/DockerIcon";
import HetznerIcon from "@/assets/icons/HetznerIcon";
import { IconProps } from "@/assets/icons/IconProperties";
import KubernetesIcon from "@/assets/icons/KubernetesIcon";
import {
  REVERSE_PROXY_ENV_REFERENCE_DOCS_LINK,
  REVERSE_PROXY_SELFHOSTED_ROUTING_DOCS_LINK,
  ReverseProxyClusterToken,
} from "@/interfaces/ReverseProxy";
import {
  CloudProvider,
  ClusterCloudDeploy,
} from "@/modules/reverse-proxy/clusters/ClusterCloudDeploy";
import { useApiCall } from "@/utils/api";
import { GRPC_API_ORIGIN, isNetBirdCloud } from "@/utils/netbird";

type DeployMethod =
  | "docker"
  | "compose"
  | "kubernetes"
  | "hetzner"
  | "digitalocean"
  | "aws";

export type ClusterSetupTab = "domain" | "dns" | "install";

const CLOUD_DEPLOY_METHODS: DeployMethod[] = ["hetzner", "digitalocean", "aws"];

// DockerIcon carries no fill of its own, so the brand blue is applied here.
// Compose has no mark of its own beyond the whale, so both Docker methods
// share it.
const DockerBrandIcon = (props: Readonly<IconProps>) => (
  <DockerIcon {...props} className={"fill-[#2496ED]"} />
);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedCommand = (command: string, highlights: string[]) => {
  const valid = highlights.filter((h) => h && h.trim().length > 0);
  const pattern =
    valid.length > 0
      ? new RegExp(`(${valid.map(escapeRegExp).join("|")})`, "g")
      : null;

  return command.split("\n").map((line, lineIndex) => (
    <Code.Line key={lineIndex}>
      {pattern
        ? line.split(pattern).map((part, partIndex) =>
            valid.includes(part) ? (
              <span key={partIndex} className={"text-netbird"}>
                {part}
              </span>
            ) : (
              part
            ),
          )
        : line}
    </Code.Line>
  ));
};

// useClusterSetup holds the state of the proxy cluster setup: the domain, the
// deployment method, the proxy token, and which tab is open. It lives with the
// host rather than inside ClusterSetupContent so the host can render its own
// actions for the current tab and act on the entered domain.
export function useClusterSetup() {
  const [tab, setTab] = useState<ClusterSetupTab>("domain");
  const [domain, setDomainValue] = useState("");
  const [token, setToken] = useState("");
  const [isGeneratingToken, setIsGeneratingToken] = useState(true);
  const [deployMethod, setDeployMethodValue] = useState<DeployMethod>("docker");
  const [proxyRegistered, setProxyRegistered] = useState(false);

  const tokenRequest = useApiCall<ReverseProxyClusterToken>(
    "/reverse-proxies/proxy-tokens",
  );

  const domainError = useMemo(() => {
    if (!domain) return "";
    const isValid = validator.isValidDomain(domain, {
      allowWildcard: false,
      allowOnlyTld: false,
      preventLeadingAndTrailingDots: true,
    });
    if (!isValid) {
      return "Please enter a valid TLD domain, e.g., company.com";
    }
    return "";
  }, [domain]);

  const isCloudDeploy = CLOUD_DEPLOY_METHODS.includes(deployMethod);
  const canAdvance = !!domain.trim() && !domainError;

  // Same convention as the add-peer modals: prefer the configured gRPC
  // endpoint so self-hosted and stage deployments point at their own
  // management service; fall back to the cloud default.
  const managementUrl = GRPC_API_ORIGIN || "https://api.netbird.io:443";

  const generateToken = useCallback(async () => {
    setIsGeneratingToken(true);
    const promise = tokenRequest
      .post({
        name: domain,
        expires_in: 0,
      })
      .then((res) => {
        setToken(res?.plain_token ?? "");
      })
      .finally(() => {
        setIsGeneratingToken(false);
      });

    notify({
      title: "Proxy Token",
      description: "Failed to generate proxy token",
      promise,
      loadingMessage: "Generating proxy token...",
      showOnlyError: true,
      preventSuccessToast: true,
    });
    return promise;
  }, [domain, tokenRequest]);

  const goToInstall = useCallback(() => {
    setTab("install");
    if (!token) generateToken();
  }, [token, generateToken]);

  // A new deploy target means the proxy has not registered yet, so any prior
  // completion state that would unlock finishing is dropped with it.
  const setDomain = (value: string) => {
    setDomainValue(value);
    setProxyRegistered(false);
  };

  // Cloud one-click deploys provision the server and surface the DNS records
  // (with the real IP) after deployment, so the standalone DNS step only
  // applies to the manual paths. Bounce off it if the method flips to cloud.
  const setDeployMethod = (method: DeployMethod) => {
    setDeployMethodValue(method);
    setProxyRegistered(false);
    if (CLOUD_DEPLOY_METHODS.includes(method) && tab === "dns") goToInstall();
  };

  const selectTab = (value: string) =>
    value === "install" ? goToInstall() : setTab(value as ClusterSetupTab);

  // next and back step through the tabs, skipping DNS for cloud deploys.
  const next = () => {
    if (tab === "dns" || (tab === "domain" && isCloudDeploy)) goToInstall();
    else if (tab === "domain") setTab("dns");
  };

  const back = () => {
    if (tab === "dns" || (tab === "install" && isCloudDeploy)) {
      setTab("domain");
    } else if (tab === "install") {
      setTab("dns");
    }
  };

  return {
    tab,
    domain,
    domainError,
    canAdvance,
    deployMethod,
    isCloudDeploy,
    token,
    isGeneratingToken,
    proxyRegistered,
    managementUrl,
    setDomain,
    setDeployMethod,
    selectTab,
    next,
    back,
    markRegistered: () => setProxyRegistered(true),
  };
}

export type ClusterSetup = ReturnType<typeof useClusterSetup>;

type Props = {
  setup: ClusterSetup;
  // inline drops the horizontal padding a modal body needs, for a host that
  // already pads its content.
  inline?: boolean;
  // Rendered under the install instructions. For cloud deploys it replaces
  // the built-in registration check, so a host tracking the registration
  // itself shows one status line, not two.
  registrationStatus?: React.ReactNode;
};

// ClusterSetupContent is the proxy cluster setup: the domain and deployment
// method, the DNS records for manual installs, and the install commands or the
// one-click cloud deploy. The clusters modal wraps it, and the Agent Network
// onboarding renders it inline.
export const ClusterSetupContent = ({
  setup,
  inline = false,
  registrationStatus,
}: Props) => {
  const {
    tab,
    domain,
    domainError,
    canAdvance,
    deployMethod,
    isCloudDeploy,
    token,
    isGeneratingToken,
    managementUrl,
  } = setup;

  const tokenValue = token || "<TOKEN>";

  const dockerCommand = `docker run -d \\
 -v proxy_certs:/certs \\
 -e NB_PROXY_CERTIFICATE_DIRECTORY=/certs \\
 -e NB_PROXY_ALLOW_INSECURE=true \\
 -e NB_PROXY_MANAGEMENT_ADDRESS=${managementUrl} \\
 -e NB_PROXY_ACME_CERTIFICATES=true \\
 -e NB_PROXY_DOMAIN=${domain} \\
 -e NB_PROXY_LOG_LEVEL=info \\
 -e NB_PROXY_TOKEN=${tokenValue} \\
 -e NB_PROXY_PRIVATE=true \\
 -e NB_PROXY_ADDRESS=:443 \\
 -p 80:80 -p 443:443 \\
 netbirdio/reverse-proxy:latest`;

  const composeCommand = `services:
  reverse-proxy:
    image: netbirdio/reverse-proxy:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      NB_PROXY_CERTIFICATE_DIRECTORY: /certs
      NB_PROXY_ALLOW_INSECURE: "true"
      NB_PROXY_MANAGEMENT_ADDRESS: "${managementUrl}"
      NB_PROXY_ACME_CERTIFICATES: "true"
      NB_PROXY_DOMAIN: "${domain}"
      NB_PROXY_LOG_LEVEL: info
      NB_PROXY_TOKEN: "${tokenValue}"
      NB_PROXY_PRIVATE: "true"
      NB_PROXY_ADDRESS: ":443"
    volumes:
      - proxy_certs:/certs
volumes:
  proxy_certs:`;

  const kubernetesCommand = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: netbird-reverse-proxy
  labels:
    app: netbird-reverse-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: netbird-reverse-proxy
  template:
    metadata:
      labels:
        app: netbird-reverse-proxy
    spec:
      containers:
        - name: reverse-proxy
          image: netbirdio/reverse-proxy:latest
          ports:
            - containerPort: 80
            - containerPort: 443
          env:
            - name: NB_PROXY_CERTIFICATE_DIRECTORY
              value: /certs
            - name: NB_PROXY_ALLOW_INSECURE
              value: "true"
            - name: NB_PROXY_MANAGEMENT_ADDRESS
              value: "${managementUrl}"
            - name: NB_PROXY_ACME_CERTIFICATES
              value: "true"
            - name: NB_PROXY_DOMAIN
              value: "${domain}"
            - name: NB_PROXY_LOG_LEVEL
              value: info
            - name: NB_PROXY_TOKEN
              value: "${tokenValue}"
            - name: NB_PROXY_PRIVATE
              value: "true"
            - name: NB_PROXY_ADDRESS
              value: ":443"
          volumeMounts:
            - name: certs
              mountPath: /certs
      volumes:
        - name: certs
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: netbird-reverse-proxy
spec:
  type: LoadBalancer
  selector:
    app: netbird-reverse-proxy
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443`;

  const deployment = {
    docker: {
      label: "Docker",
      title: "Run with Docker",
      command: dockerCommand,
    },
    compose: {
      label: "Docker Compose",
      title: "Run with Docker Compose",
      command: composeCommand,
    },
    kubernetes: {
      label: "Kubernetes",
      title: "Deploy on Kubernetes",
      command: kubernetesCommand,
    },
    hetzner: {
      label: "Hetzner Cloud",
      title: "Deploy on Hetzner Cloud",
      command: "",
    },
    digitalocean: {
      label: "DigitalOcean",
      title: "Deploy on DigitalOcean",
      command: "",
    },
    aws: {
      label: "AWS CloudFormation",
      title: "Deploy on AWS",
      command: "",
    },
  }[deployMethod];

  const deployDescription =
    deployMethod === "digitalocean"
      ? "Launch a droplet to run the proxy."
      : deployMethod === "aws"
      ? "Launch a dedicated AWS server to run the proxy."
      : isCloudDeploy
      ? "Launch a cloud server to run the proxy."
      : deployMethod === "kubernetes"
      ? "Apply this manifest to start the proxy."
      : "Run on your machine to start the proxy.";

  const tabContentClass = inline ? "pb-2" : "pb-8";
  const bodyClass = inline ? "" : "px-8";

  return (
    <Tabs value={tab} onValueChange={setup.selectTab}>
      <TabsList justify={"start"} className={inline ? "px-0" : "px-8"}>
        <TabsTrigger value={"domain"}>
          <GlobeIcon size={14} />
          Domain
        </TabsTrigger>
        {!isCloudDeploy && (
          <TabsTrigger value={"dns"} disabled={!canAdvance}>
            <ListIcon size={14} />
            DNS Records
          </TabsTrigger>
        )}
        <TabsTrigger value={"install"} disabled={!canAdvance}>
          <SquareTerminalIcon size={14} />
          {isCloudDeploy ? "Deploy" : "Run the Proxy"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={"domain"} className={tabContentClass}>
        <div className={cn(bodyClass, "flex flex-col gap-6")}>
          <div>
            <Label>Domain</Label>
            <HelpText>
              Enter a domain name that will be used for your cluster.
            </HelpText>
            <Input
              autoFocus={true}
              placeholder={"e.g., proxy.company.com"}
              value={domain}
              error={domainError}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setup.setDomain(e.target.value)
              }
            />
          </div>
          <div>
            <Label>Deployment Method</Label>
            <HelpText>{deployDescription}</HelpText>
            <SelectDropdown
              value={deployMethod}
              onChange={(v) => setup.setDeployMethod(v as DeployMethod)}
              options={[
                { value: "docker", label: "Docker", icon: DockerBrandIcon },
                {
                  value: "compose",
                  label: "Docker Compose",
                  icon: DockerBrandIcon,
                },
                {
                  value: "kubernetes",
                  label: "Kubernetes",
                  icon: KubernetesIcon,
                },
                {
                  value: "hetzner",
                  label: "Hetzner Cloud",
                  icon: HetznerIcon,
                },
                {
                  value: "digitalocean",
                  label: "DigitalOcean",
                  icon: DigitalOceanIcon,
                },
                {
                  value: "aws",
                  label: "AWS CloudFormation",
                  icon: AWSIcon,
                },
              ]}
            />
          </div>
          {!isCloudDeploy && (
            <Callout variant={"info"}>
              In order to run the proxy, please make sure your machine meets the
              following requirements:
              <ul className={"list-disc pl-4 mt-2 flex flex-col gap-1"}>
                <li>
                  <span className={"text-white font-medium"}>
                    Publicly accessible IP address
                  </span>
                </li>
                <li>
                  <span className={"text-white font-medium"}>Docker</span>{" "}
                  installed and running
                </li>
                <li>
                  <span className={"text-white font-medium"}>
                    Port 80 and 443
                  </span>{" "}
                  open and not in use
                </li>
              </ul>
            </Callout>
          )}
        </div>
      </TabsContent>

      <TabsContent value={"dns"} className={tabContentClass}>
        <div className={cn(bodyClass, "flex flex-col")}>
          <div>
            <Label>Configure DNS</Label>
            <HelpText>
              Add the following DNS records pointing to your machine&apos;s
              public IP address.
            </HelpText>
          </div>
          <CardTable>
            <CardTable.Header>
              <CardTable.HeaderCell width={100}>Type</CardTable.HeaderCell>
              <CardTable.HeaderCell>Name</CardTable.HeaderCell>
              <CardTable.HeaderCell>Content</CardTable.HeaderCell>
            </CardTable.Header>
            <CardTable.Body>
              <CardTable.Row>
                <CardTable.Cell>A</CardTable.Cell>
                <CardTable.Cell copy copyText={domain}>
                  {domain}
                </CardTable.Cell>
                <CardTable.Cell className={"italic"}>
                  Your machine&apos;s IP
                </CardTable.Cell>
              </CardTable.Row>
              <CardTable.Row>
                <CardTable.Cell>CNAME</CardTable.Cell>
                <CardTable.Cell copy copyText={`*.${domain}`}>
                  {`*.${domain}`}
                </CardTable.Cell>
                <CardTable.Cell copy copyText={domain}>
                  {domain}
                </CardTable.Cell>
              </CardTable.Row>
            </CardTable.Body>
          </CardTable>
        </div>
      </TabsContent>

      <TabsContent value={"install"} className={tabContentClass}>
        <div className={cn(bodyClass, "flex flex-col gap-4")}>
          <div>
            <Label>{deployment.title}</Label>
            <HelpText className={"mb-0"}>{deployDescription}</HelpText>
          </div>

          {!isNetBirdCloud() && (
            <Callout variant={"warning"}>
              For self-hosted deployments, make sure the proxy service routes
              are configured on your NetBird management server before starting
              the proxy.&nbsp;
              <InlineLink
                href={REVERSE_PROXY_SELFHOSTED_ROUTING_DOCS_LINK}
                target={"_blank"}
                className={"block mt-1"}
              >
                Required routing endpoints
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Callout>
          )}

          {isCloudDeploy ? (
            <ClusterCloudDeploy
              provider={deployMethod as CloudProvider}
              domain={domain}
              token={token}
              managementUrl={managementUrl}
              isGeneratingToken={isGeneratingToken}
              onRegistered={setup.markRegistered}
              registrationStatus={registrationStatus}
            />
          ) : (
            <>
              <Code
                key={deployMethod}
                codeToCopy={deployment.command}
                className={cn(
                  "overflow-hidden",
                  isGeneratingToken && "!border-nb-gray-930",
                )}
                showCopyIcon={!isGeneratingToken}
              >
                {isGeneratingToken && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-nb-gray-100 bg-nb-gray-950/90">
                    <Loader2 size={16} className="animate-spin" />
                    Generating proxy token...
                  </div>
                )}

                {renderHighlightedCommand(deployment.command, [
                  managementUrl,
                  domain,
                  tokenValue,
                ])}
              </Code>

              <HelpText className={"mb-0"}>
                Need to fine-tune the proxy? See all available&nbsp;
                <InlineLink
                  href={REVERSE_PROXY_ENV_REFERENCE_DOCS_LINK}
                  target={"_blank"}
                >
                  environment variables
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </HelpText>

              {registrationStatus}
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};
