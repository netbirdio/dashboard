import Badge from "@components/Badge";
import MultipleGroups, {
  TransparentEditIconButton,
} from "@components/ui/MultipleGroups";
import { IconCirclePlus } from "@tabler/icons-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource?: NetworkResource;
};
export const ResourceGroupCell = ({ resource }: Props) => {
  const { permission } = usePermissions();

  const { network, openResourceGroupModal } = useNetworksContext();

  const groups = resource?.groups as Group[] | undefined;
  const hasGroups = groups && groups.length > 0;

  return (
    <button
      className={"flex cursor-pointer items-center justify-center gap-1 group"}
      onClick={() => {
        if (!network || !permission.networks.update) return;
        openResourceGroupModal(network, resource);
      }}
    >
      {hasGroups ? (
        <>
          <MultipleGroups
            groups={groups}
            showResources={true}
            redirectGroupTab={"resources"}
          />
          {permission.networks.update && <TransparentEditIconButton />}
        </>
      ) : (
        <Badge
          variant={"gray"}
          useHover={true}
          disabled={!permission.networks.update}
        >
          <IconCirclePlus size={14} />
          Add Groups
        </Badge>
      )}
    </button>
  );
};
