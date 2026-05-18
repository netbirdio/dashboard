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
import {
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  ReverseProxyClusterToken,
} from "@/interfaces/ReverseProxy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ClustersModal = ({ open, onOpenChange }: Props) => {
  const { mutate } = useSWRConfig();
  const [tab, setTab] = useState("domain");
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [isGeneratingToken, setIsGeneratingToken] = useState(true);

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

  const dockerCommand = `docker run -d \\
 -v /var/lib/certs:/certs \\
 -e NB_PROXY_CERTIFICATE_DIRECTORY=/certs \\
 -e NB_PROXY_ALLOW_INSECURE=true \\
 -e NB_PROXY_MANAGEMENT_ADDRESS=${managementUrl} \\
 -e NB_PROXY_ACME_CERTIFICATES=true \\
 -e NB_PROXY_DOMAIN=${domain} \\
 -e NB_PROXY_LOG_LEVEL=info \\
 -e NB_PROXY_TOKEN=${token || "<TOKEN>"} \\
 -p 80:80 -p 443:443 \\
 netbirdio/reverse-proxy:latest`;

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
          description={"Setup a self-hosted cluster"}
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
            <div className={"px-8 flex flex-col"}>
              <div>
                <Label>Run the Proxy with Docker</Label>
                <HelpText>
                  Run the following command on your machine to start the proxy.
                </HelpText>
              </div>
              <Code
                codeToCopy={dockerCommand}
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

                <Code.Line>docker run -d \</Code.Line>
                <Code.Line> -v /var/lib/certs:/certs \</Code.Line>
                <Code.Line>
                  {" "}
                  -e NB_PROXY_CERTIFICATE_DIRECTORY=/certs \
                </Code.Line>
                <Code.Line> -e NB_PROXY_ALLOW_INSECURE=true \</Code.Line>
                <Code.Line>
                  {" "}
                  -e NB_PROXY_MANAGEMENT_ADDRESS=
                  <span className={"text-netbird"}>{managementUrl}</span> \
                </Code.Line>
                <Code.Line> -e NB_PROXY_ACME_CERTIFICATES=true \</Code.Line>
                <Code.Line>
                  {" "}
                  -e NB_PROXY_DOMAIN=
                  <span className={"text-netbird"}>{domain}</span> \
                </Code.Line>
                <Code.Line> -e NB_PROXY_LOG_LEVEL=info \</Code.Line>
                <Code.Line>
                  {" "}
                  -e NB_PROXY_TOKEN=
                  <span className={"text-netbird"}>{token || "<TOKEN>"}</span> \
                </Code.Line>
                <Code.Line> -p 80:80 -p 443:443 \</Code.Line>
                <Code.Line> netbirdio/reverse-proxy:latest</Code.Line>
              </Code>
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
                Self-Hosted Cluster
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
