import Button from "@components/Button";
import { notify } from "@components/Notification";
import { RadioCard, RadioCardGroup } from "@components/RadioCard";
import { useApiCall } from "@utils/api";
import { GlobeIcon, NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { ResourceSingleAddressInput } from "@/modules/networks/resources/ResourceSingleAddressInput";

type Props = {
  onNetworkCreation?: (network: Network) => void;
  onResourceCreation?: (resource: NetworkResource) => void;
  onBack: () => void;
};

export const OnboardingAddResource = ({
  onNetworkCreation,
  onResourceCreation,
  onBack,
}: Props) => {
  const [resourceType, setResourceType] = useState("");
  const [resourceAddress, setResourceAddress] = useState("");
  const [error, setError] = useState("");
  const [network, setNetwork] = useState<Network>();
  const { mutate } = useSWRConfig();
  const { groups } = useGroups();

  const networkRequest = useApiCall<Network>("/networks", true);
  const resourceRequest = useApiCall<NetworkResource>("/networks", true);
  const policyRequest = useApiCall<Policy>("/policies", true);
  const groupRequest = useApiCall<Group>("/groups", true);

  const allGroupId = groups?.find((g) => g.name === "All")?.id;

  /**
   * Create a new network and add a resource to it
   */
  const createResource = async () => {
    let myNetwork = network;

    if (!network) {
      await networkRequest
        .post({
          name: "My First Network",
          description: "Created during onboarding",
        })
        .then((n) => {
          myNetwork = n;
          onNetworkCreation?.(n);
          setNetwork(n);
        });
    }

    if (!myNetwork) return;

    notify({
      title: "My First Network",
      description: "Network & Resource created successfully",
      loadingMessage: "Creating your resource...",
      promise: resourceRequest
        .post(
          {
            name: resourceType === "subnet" ? "My Subnet" : "My Resource",
            description: "Created during onboarding",
            address: resourceAddress,
            enabled: true,
            groups: [],
          },
          `/${myNetwork.id}/resources`,
        )
        .then((r) => {
          onResourceCreation?.(r);
          createOnboardingGroups().then(({ usersGroup, routingPeersGroup }) => {
            createUsersToResourcePolicy(r, usersGroup);
            createUsersToRoutingPeersPolicy(r, usersGroup, routingPeersGroup);
          });
        }),
    });
  };

  /**
   * Create Users and Routing Peers groups if they do not exist
   */
  const createOnboardingGroups = async () => {
    let usersGroup = groups?.find((group) => group.name === "Users");
    let routingPeersGroup = groups?.find(
      (group) => group.name === "Routing Peers",
    );
    if (!usersGroup) {
      usersGroup = await groupRequest.post({
        name: "Users",
      });
    }
    if (!routingPeersGroup) {
      routingPeersGroup = await groupRequest.post({
        name: "Routing Peers",
      });
    }
    return {
      usersGroup,
      routingPeersGroup,
    };
  };

  /**
   * Create a policy that allows users to access the resource
   */
  const createUsersToResourcePolicy = async (
    r: NetworkResource,
    usersGroup: Group,
  ) => {
    const isSubnet = r.type === "subnet";

    await policyRequest.post({
      name: `Users to ${r.name}`,
      description: `Allows access to this ${
        isSubnet ? `subnet ${r.address}` : `resource ${r.address}`
      }`,
      enabled: true,
      rules: [
        {
          name: `Users to ${r.name}`,
          description: `Allows access to this ${
            isSubnet ? `subnet ${r.address}` : `resource ${r.address}`
          }`,
          enabled: true,
          action: "accept",
          bidirectional: true,
          protocol: "all",
          sources: usersGroup ? [usersGroup.id] : [allGroupId],
          destinationResource: {
            type: r.type,
            id: r.id,
          },
        },
      ],
    });
  };

  /**
   * Create a policy that allows users to access routing peers
   */
  const createUsersToRoutingPeersPolicy = async (
    r: NetworkResource,
    usersGroup: Group,
    routingPeersGroup: Group,
  ) => {
    await policyRequest
      .post({
        name: `Users to Routing Peers`,
        description: `Allows users to access routing peers`,
        enabled: true,
        rules: [
          {
            name: `Users to Routing Peers`,
            description: `Allows users to access routing peers`,
            enabled: true,
            action: "accept",
            bidirectional: true,
            protocol: "all",
            sources: usersGroup ? [usersGroup.id] : [allGroupId],
            destinations: routingPeersGroup
              ? [routingPeersGroup.id]
              : [allGroupId],
          },
        ],
      })
      .then(() => {
        mutate("/policies");
        mutate("/groups");
      });
  };

  const description = useMemo(() => {
    if (resourceType === "ip")
      return "Enter a single IPv4 address of your resource";
    if (resourceType === "subnet") return "Enter a CIDR range of your network";
    if (resourceType === "domain")
      return "Enter a domain name of your resource";
  }, [resourceType]);

  const placeholder = useMemo(() => {
    if (resourceType === "ip") return "e.g., 192.168.31.45";
    if (resourceType === "subnet") return "e.g., 192.168.1.0/24";
    if (resourceType === "domain")
      return "e.g., service.internal or *.services.internal";
  }, [resourceType]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div className={"flex flex-col gap-8"}>
        <div>
          <h1 className={"text-xl text-center"}>Add your first resource</h1>
          <div
            className={
              "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
            }
          >
            Resources are your subnets, services, or machines inside your network.
            Pick the type you want to connect to.
          </div>
        </div>

        <RadioCardGroup value={resourceType} onValueChange={setResourceType}>
          <RadioCard
            value={"ip"}
            title={"Single IP Address"}
            icon={<WorkflowIcon size={12} />}
            description={"IPv4 address like 192.168.31.45"}
          />
          <RadioCard
            value={"subnet"}
            title={"Entire Subnet"}
            icon={<NetworkIcon size={12} />}
            description={"CIDR range like 192.168.0.0/24"}
          />
          <RadioCard
            value={"domain"}
            title={"Domain"}
            icon={<GlobeIcon size={12} />}
            description={
              "A domain like service.internal or a wildcard like *.services.internal"
            }
          />
        </RadioCardGroup>

        {resourceType && (
          <ResourceSingleAddressInput
            label={"What is the address of your resource?"}
            value={resourceAddress}
            onChange={setResourceAddress}
            onError={setError}
            description={description}
            placeholder={placeholder}
          />
        )}

        <div className={"flex gap-4"}>
          <Button variant={"secondary"} className={"w-full"} onClick={onBack}>
            Go Back
          </Button>
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={createResource}
            disabled={resourceAddress === "" || error !== ""}
          >
            Create Resource
          </Button>
        </div>
      </div>
    </div>
  );
};
