import { Callout } from "@components/Callout";
import FeatureCard from "@components/FeatureCard";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import * as Tabs from "@radix-ui/react-tabs";
import loadConfig from "@utils/config";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import {
  fetchMcpStatus,
  getMcpClients,
  getMcpServerUrl,
  MCP_DOCS_URL,
  MCP_SELF_HOSTED_DOCS_URL,
  MCP_SIGN_IN_DOCS_URL,
  McpClient,
  resolveMcpStatus,
} from "@/modules/mcp/mcp";
import McpClientIcon from "@/modules/mcp/McpClientIcon";
import McpClientModal from "@/modules/mcp/McpClientModal";

const config = loadConfig();
// Height of a client tile, so the grid does not jump when the tiles replace the skeleton.
const TILE_HEIGHT = 91.5;

export default function MCPTab() {
  const url = getMcpServerUrl(config.apiOrigin);
  const cloud = isNetBirdCloud();
  const { data: probed, error } = useSWR(
    cloud ? null : ["mcp-status", url],
    () =>
      fetchMcpStatus(
        url,
        new URL(url, location.href).origin !== location.origin,
      ),
  );
  const clients = useMemo(() => getMcpClients(url), [url]);
  const [client, setClient] = useState<McpClient>();
  // A check that could not reach the server leaves the clients usable.
  const loading = !cloud && probed === undefined && !error;
  const status = resolveMcpStatus(cloud, probed);
  const disabled = status === "disabled";

  return (
    <Tabs.Content value={"mcp"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <h1 className={"mt-0"}>MCP</h1>
        <Paragraph className={"block"}>
          Connect an AI assistant to manage your NetBird account.{" "}
          <InlineLink href={MCP_DOCS_URL} target={"_blank"}>
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>

        {disabled && (
          <Callout
            variant={"warning"}
            className={"mt-6"}
            data-testid={"mcp-disabled"}
          >
            MCP is disabled. Enable it on the container that runs management.{" "}
            <InlineLink href={MCP_SELF_HOSTED_DOCS_URL} target={"_blank"}>
              Learn more
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Callout>
        )}
        {status === "token-only" && (
          <Callout
            variant={"warning"}
            className={"mt-6"}
            data-testid={"mcp-token-only"}
          >
            MCP sign-in is unavailable. Clients need a personal access token.{" "}
            <InlineLink href={MCP_SIGN_IN_DOCS_URL} target={"_blank"}>
              Learn more
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Callout>
        )}

        <div className={"grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6"}>
          {loading &&
            clients.map((c) => (
              <Skeleton
                key={c.id}
                height={TILE_HEIGHT}
                className={"rounded-lg border border-nb-gray-900/50"}
                containerClassName={"flex"}
                containerTestId={"mcp-client-skeleton"}
              />
            ))}
          {!loading &&
            clients.map((c) => (
              <FeatureCard
                key={c.id}
                variant={"option"}
                icon={<McpClientIcon client={c.id} size={20} />}
                title={c.name}
                disabled={disabled}
                href={c.href}
                onClick={c.href ? undefined : () => setClient(c)}
              />
            ))}
        </div>
        <McpClientModal client={client} onClose={() => setClient(undefined)} />
      </div>
    </Tabs.Content>
  );
}
