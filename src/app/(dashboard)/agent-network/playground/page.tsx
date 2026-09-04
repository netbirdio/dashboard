"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import PeersProvider from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PageContainer from "@/layouts/PageContainer";
import AIProvidersProvider from "@/modules/agent-network/AIProvidersProvider";
import AgentNetworkPlayground from "@/modules/agent-network/playground/AgentNetworkPlayground";

function PlaygroundPageContent() {
  const { permission } = usePermissions();
  const canReadPrincipal = Boolean(
    (permission?.peers?.read && permission?.users?.read) ||
      permission?.groups?.read,
  );

  return (
    <RestrictedAccess page="Playground identities" hasAccess={canReadPrincipal}>
      <PeersProvider>
        <AIProvidersProvider>
          <div className="p-default py-6">
            <Breadcrumbs>
              <Breadcrumbs.Item
                href="/agent-network/providers"
                label="Agent Network"
                icon={<AgentNetworkIcon size={16} />}
              />
              <Breadcrumbs.Item
                href="/agent-network/playground"
                label="Playground"
                active
              />
            </Breadcrumbs>
            <h1>Playground</h1>
            <Paragraph>
              Emulate a peer-backed user or a synthetic group and inspect the
              real policy, provider, accounting, and response path.
            </Paragraph>
            <div className="mt-6">
              <AgentNetworkPlayground />
            </div>
          </div>
        </AIProvidersProvider>
      </PeersProvider>
    </RestrictedAccess>
  );
}

export default function AgentNetworkPlaygroundPage() {
  const { permission } = usePermissions();
  return (
    <PageContainer>
      <RestrictedAccess
        page="Agent Network Playground"
        hasAccess={permission?.services?.create}
      >
        <PlaygroundPageContent />
      </RestrictedAccess>
    </PageContainer>
  );
}
