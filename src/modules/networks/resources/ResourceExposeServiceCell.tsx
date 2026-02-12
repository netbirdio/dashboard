import Button from "@components/Button";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { NetworkResource } from "@/interfaces/Network";
import { isResourceTargetType } from "@/contexts/ReverseProxiesProvider";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import Badge from "@components/Badge";
import { CirclePlusIcon } from "lucide-react";

type Props = {
  resource: NetworkResource;
};

export const ResourceExposeServiceCell = ({ resource }: Props) => {
  const { permission } = usePermissions();
  const { openModal, reverseProxies } = useReverseProxies();
  const { network } = useNetworksContext();
  const router = useRouter();

  const servicesCount = useMemo(() => {
    if (!reverseProxies) return 0;
    return reverseProxies.filter((proxy) =>
      proxy.targets.some(
        (target) =>
          isResourceTargetType(target.target_type) &&
          target.target_id === resource.id,
      ),
    ).length;
  }, [reverseProxies, resource.id]);

  return (
    <div className={"flex items-center gap-3"}>
      {servicesCount > 0 && (
        <Badge
          variant={"gray"}
          useHover={false}
          className={"select-none hover:bg-nb-gray-910 cursor-pointer"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/network?id=${network?.id}&tab=services&target=${resource.id}`);
          }}
        >
          <ReverseProxyIcon size={14} className={"fill-green-500"} />
          <div>
            <span className={"font-medium text-xs"}>{servicesCount}</span>
          </div>
        </Badge>
      )}
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"!px-3"}
        onClick={(e) => {
          e.stopPropagation();
          openModal({
            initialResource: resource,
            initialNetwork: network,
            onSuccess: () => {
              router.push(`/network?id=${network?.id}&tab=services`);
            },
          });
        }}
        disabled={!permission.routes?.create}
      >
        <CirclePlusIcon size={12} />
        Expose Service
      </Button>
    </div>
  );
};
