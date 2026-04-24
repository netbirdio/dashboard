import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2, Undo2Icon } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  EntraDeviceMapping,
  EntraDeviceMappingRequest,
} from "@/interfaces/EntraDeviceAuth";

type Props = {
  mapping: EntraDeviceMapping;
  onEdit?: (mapping: EntraDeviceMapping) => void;
};

/**
 * Per-row revoke / delete controls for a mapping, mirroring
 * SetupKeyActionCell.
 */
export default function EntraDeviceMappingActionCell({
  mapping,
}: Readonly<Props>) {
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const request = useApiCall<EntraDeviceMapping>(
    `/integrations/entra-device-auth/mappings/${mapping.id}`,
  );

  const canUpdate = permission?.entra_device_auth?.update ?? true;
  const canDelete = permission?.entra_device_auth?.delete ?? true;

  const handleRevoke = async () => {
    const choice = await confirm({
      title: `Revoke '${mapping.name || "mapping"}'?`,
      description:
        "Revoked mappings are ignored during enrollment. Existing peers stay registered.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    const payload: EntraDeviceMappingRequest = {
      name: mapping.name,
      entra_group_id: mapping.entra_group_id,
      auto_groups: mapping.auto_groups ?? [],
      ephemeral: mapping.ephemeral,
      allow_extra_dns_labels: mapping.allow_extra_dns_labels,
      expires_at: mapping.expires_at ?? null,
      revoked: true,
      priority: mapping.priority ?? 0,
    };
    notify({
      title: mapping.name || "Entra mapping",
      description: "Mapping revoked.",
      promise: request.put(payload).then(() => {
        mutate("/integrations/entra-device-auth/mappings");
      }),
      loadingMessage: "Revoking mapping...",
    });
  };

  const handleDelete = async () => {
    const choice = await confirm({
      title: `Delete '${mapping.name || "mapping"}'?`,
      description:
        "Deleting a mapping is permanent. Existing peers stay registered but will no longer re-evaluate against this mapping.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    notify({
      title: mapping.name || "Entra mapping",
      description: "Mapping deleted.",
      promise: request.del().then(() => {
        mutate("/integrations/entra-device-auth/mappings");
      }),
      loadingMessage: "Deleting mapping...",
    });
  };

  return (
    <div className="flex justify-end pr-4">
      <Button
        variant="danger-outline"
        size="sm"
        onClick={handleRevoke}
        disabled={mapping.revoked || !canUpdate}
      >
        <Undo2Icon size={16} />
        Revoke
      </Button>
      <Button
        variant="danger-outline"
        size="sm"
        onClick={handleDelete}
        disabled={!canDelete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}
