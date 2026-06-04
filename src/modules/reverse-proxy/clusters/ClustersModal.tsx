import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { notify } from "@components/Notification";
import CardTable from "@components/CardTable";
import Code from "@components/Code";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import ModalHeader from "@components/modal/ModalHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import {
  ExternalLinkIcon,
  GlobeIcon,
  ListIcon,
  Loader2,
  ServerIcon,
  SquareTerminalIcon,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useApiCall } from "@/utils/api";
import { cn, validator } from "@utils/helpers";
import { GRPC_API_ORIGIN, isNetBirdHosted } from "@/utils/netbird";
import { SelectDropdown } from "@components/select/SelectDropdown";
import {
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  REVERSE_PROXY_ENV_REFERENCE_DOCS_LINK,
  REVERSE_PROXY_SELFHOSTED_ROUTING_DOCS_LINK,
  ReverseProxyClusterToken,
} from "@/interfaces/ReverseProxy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DeployMethod = "docker" | "compose" | "kubernetes";

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

export const ClustersModal = ({ open, onOpenChange }: Props) => {
  const { mutate } = useSWRConfig();
  const [tab, setTab] = useState("domain");
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [isGeneratingToken, setIsGeneratingToken] = useState(true);
  const [deployMethod, setDeployMethod] = useState<DeployMethod>("docker");

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

  const managementUrl = isNetBirdHosted()
    ? "https://api.netbird.io"
    : GRPC_API_ORIGIN || "";

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
    docker: { label: "Docker", title: "Run the Proxy with Docker", command: dockerCommand },
    compose: {
      label: "Docker Compose",
      title: "Run the Proxy with Docker Compose",
      command: composeCommand,
    },
    kubernetes: {
      label: "Kubernetes",
      title: "Deploy the Proxy on Kubernetes",
      command: kubernetesCommand,
    },
  }[deployMethod];

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
          description={"Setup a proxy cluster"}
          color={"netbird"}
        />

        <Tabs
          value={tab}
          onValueChange={(v) => (v === "install" ? goToInstall() : setTab(v))}
        >
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"domain"}>
              <GlobeIcon size={14} />
              Domain
            </TabsTrigger>
            <TabsTrigger
              value={"dns"}
              disabled={!domain.trim() || !!domainError}
            >
              <ListIcon size={14} />
              DNS Records
            </TabsTrigger>
            <TabsTrigger
              value={"install"}
              disabled={!domain.trim() || !!domainError}
            >
              <SquareTerminalIcon size={14} />
              Run the Proxy
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"domain"} className={"pb-8"}>
            <div className={"px-8 flex flex-col gap-6"}>
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
                    setDomain(e.target.value)
                  }
                />
              </div>
              <Callout variant={"info"}>
                In order to run the proxy, please make sure your machine meets
                the following requirements:
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
            </div>
          </TabsContent>

          <TabsContent value={"dns"} className={"pb-8"}>
            <div className={"px-8 flex flex-col"}>
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

          <TabsContent value={"install"} className={"pb-8"}>
            <div className={"px-8 flex flex-col gap-4"}>
              <div className={"flex items-end justify-between gap-4"}>
                <div>
                  <Label>{deployment.title}</Label>
                  <HelpText className={"mb-0"}>
                    {deployMethod === "kubernetes"
                      ? "Apply the following manifest to your cluster to start the proxy."
                      : "Run the following on your machine to start the proxy."}
                  </HelpText>
                </div>
                <div className={"w-[180px] shrink-0"}>
                  <SelectDropdown
                    value={deployMethod}
                    onChange={(v) => setDeployMethod(v as DeployMethod)}
                    options={[
                      { value: "docker", label: "Docker" },
                      { value: "compose", label: "Docker Compose" },
                      { value: "kubernetes", label: "Kubernetes" },
                    ]}
                  />
                </div>
              </div>

              {!isNetBirdHosted() && (
                <Callout variant={"warning"}>
                  For self-hosted deployments, make sure the proxy service
                  routes are configured on your NetBird management server before
                  starting the proxy.&nbsp;
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
            </div>
          </TabsContent>
        </Tabs>

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
                  onClick={() => setTab("dns")}
                  disabled={!domain.trim() || !!domainError}
                >
                  Continue
                </Button>
              </>
            )}
            {tab === "dns" && (
              <>
                <Button variant={"secondary"} onClick={() => setTab("domain")}>
                  Back
                </Button>
                <Button variant={"primary"} onClick={goToInstall}>
                  Continue
                </Button>
              </>
            )}
            {tab === "install" && (
              <>
                <Button variant={"secondary"} onClick={() => setTab("dns")}>
                  Back
                </Button>
                <Button variant={"primary"} onClick={finishSetup}>
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
