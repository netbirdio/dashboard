import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import Separator from "@components/Separator";
import { useApiCall } from "@utils/api";
import { trim } from "lodash";
import {
  AlarmClock,
  FingerprintIcon,
  GlobeIcon,
  PlusCircle,
  PowerOffIcon,
  SaveIcon,
  TagIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import {
  EntraDeviceMapping,
  EntraDeviceMappingRequest,
} from "@/interfaces/EntraDeviceAuth";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  open: boolean;
  onClose: () => void;
  mapping?: EntraDeviceMapping | null;
};

/**
 * Create / edit modal for a single Entra device auth mapping, modelled after
 * SetupKeyModal so admins see consistent controls (auto-groups, ephemeral,
 * extra-DNS labels, expires-in, priority, revoked).
 */
export default function EntraDeviceMappingModal({
  open,
  onClose,
  mapping,
}: Readonly<Props>) {
  const isEditing = !!mapping?.id;
  const { mutate } = useSWRConfig();

  const createRequest = useApiCall<EntraDeviceMapping>(
    "/integrations/entra-device-auth/mappings",
  );
  const updateRequest = useApiCall<EntraDeviceMapping>(
    `/integrations/entra-device-auth/mappings/${mapping?.id ?? ""}`,
  );

  const [name, setName] = useState(mapping?.name ?? "");
  const [entraGroupId, setEntraGroupId] = useState(mapping?.entra_group_id ?? "");
  const [ephemeral, setEphemeral] = useState(mapping?.ephemeral ?? false);
  const [allowExtraDNSLabels, setAllowExtraDNSLabels] = useState(
    mapping?.allow_extra_dns_labels ?? false,
  );
  const [revoked, setRevoked] = useState(mapping?.revoked ?? false);
  const [priority, setPriority] = useState(String(mapping?.priority ?? 0));
  const [expiresInDays, setExpiresInDays] = useState(() => {
    if (!mapping?.expires_at) return "";
    const diffMs =
      new Date(mapping.expires_at).getTime() - Date.now();
    if (diffMs <= 0) return "";
    return String(Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  });

  const [selectedGroups, setSelectedGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: mapping?.auto_groups ?? [],
    });

  const isDisabled = useMemo(() => {
    if (trim(name).length === 0) return true;
    if (trim(entraGroupId).length === 0) return true;
    if (priority !== "" && isNaN(parseInt(priority, 10))) return true;
    if (expiresInDays !== "" && isNaN(parseInt(expiresInDays, 10))) return true;
    return false;
  }, [name, entraGroupId, priority, expiresInDays]);

  const buildRequest = async (): Promise<EntraDeviceMappingRequest> => {
    const groups = await saveGroups();
    let expiresAt: string | null = null;
    if (trim(expiresInDays).length > 0) {
      const days = parseInt(expiresInDays, 10);
      if (!isNaN(days) && days > 0) {
        expiresAt = new Date(
          Date.now() + days * 24 * 60 * 60 * 1000,
        ).toISOString();
      }
    }
    return {
      name: trim(name),
      entra_group_id: trim(entraGroupId),
      auto_groups: groups.map((g) => g.id!).filter(Boolean),
      ephemeral,
      allow_extra_dns_labels: allowExtraDNSLabels,
      expires_at: expiresAt,
      revoked,
      priority: parseInt(priority || "0", 10) || 0,
    };
  };

  const submit = async () => {
    const payload = await buildRequest();
    const call = isEditing ? updateRequest.put(payload) : createRequest.post(payload);
    notify({
      title: isEditing ? "Update mapping" : "Create mapping",
      description: isEditing
        ? "Mapping updated successfully."
        : "Mapping created successfully.",
      promise: call.then(() => {
        mutate("/integrations/entra-device-auth/mappings");
        mutate("/groups");
        onClose();
      }),
      loadingMessage: isEditing
        ? "Saving mapping..."
        : "Creating mapping...",
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(state) => !state && onClose()}
      key={open ? 1 : 0}
    >
      <ModalContent maxWidthClass="max-w-xl">
        <ModalHeader
          icon={<FingerprintIcon size={18} />}
          title={isEditing ? "Edit mapping" : "Create mapping"}
          description={
            isEditing
              ? "Update the Entra → NetBird mapping configuration"
              : "Map an Entra security group onto NetBird auto-groups"
          }
          color="netbird"
        />

        <Separator />

        <div className="px-8 py-6 flex flex-col gap-8">
          <div>
            <Label>Name</Label>
            <HelpText>
              Friendly name shown in the admin UI and activity logs.
            </HelpText>
            <Input
              placeholder="e.g., Corporate Laptops"
              value={name}
              onChange={(e) => setName(e.target.value)}
              customPrefix={<TagIcon size={16} className="text-nb-gray-300" />}
            />
          </div>

          <div>
            <Label>Entra group ID</Label>
            <HelpText>
              Microsoft Entra security group Object ID (GUID). Use{" "}
              <code className="text-xs">*</code> to match any device from the
              configured tenant.
            </HelpText>
            <Input
              placeholder="00000000-0000-0000-0000-000000000000 or *"
              value={entraGroupId}
              onChange={(e) => setEntraGroupId(e.target.value)}
              customPrefix={
                <FingerprintIcon size={16} className="text-nb-gray-300" />
              }
            />
          </div>

          <div>
            <Label>Auto-assigned NetBird groups</Label>
            <HelpText>
              Peers enrolled via this mapping are automatically placed in these
              groups.
            </HelpText>
            <PeerGroupSelector
              onChange={setSelectedGroups}
              values={selectedGroups}
              hideAllGroup
            />
          </div>

          <div className="flex justify-between gap-6">
            <div className="flex-1">
              <Label>Priority</Label>
              <HelpText>
                Lower values win in{" "}
                <code className="text-xs">strict_priority</code> mode. Ignored
                in <code className="text-xs">union</code> mode.
              </HelpText>
              <Input
                type="number"
                value={priority}
                placeholder="0"
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>Expires in</Label>
              <HelpText>
                Days until this mapping stops matching. Leave empty for no
                expiry.
              </HelpText>
              <Input
                type="number"
                min={1}
                value={expiresInDays}
                placeholder="Never"
                onChange={(e) => setExpiresInDays(e.target.value)}
                customPrefix={
                  <AlarmClock size={16} className="text-nb-gray-300" />
                }
                customSuffix="Day(s)"
              />
            </div>
          </div>

          <FancyToggleSwitch
            value={ephemeral}
            onChange={setEphemeral}
            label={
              <>
                <PowerOffIcon size={15} />
                Ephemeral peers
              </>
            }
            helpText="Peers offline for more than 10 minutes are removed automatically."
          />

          <FancyToggleSwitch
            value={allowExtraDNSLabels}
            onChange={setAllowExtraDNSLabels}
            label={
              <>
                <GlobeIcon size={15} />
                Allow extra DNS labels
              </>
            }
            helpText="Enable multiple subdomain labels (e.g. host.dev.example.com)."
          />

          <FancyToggleSwitch
            value={revoked}
            onChange={setRevoked}
            label={
              <>
                <PowerOffIcon size={15} />
                Revoked
              </>
            }
            helpText="Revoked mappings are ignored during enrollment but kept for audit."
          />
        </div>

        <ModalFooter className="items-center">
          <div className="flex gap-3 w-full justify-end">
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              variant="primary"
              onClick={submit}
              disabled={isDisabled}
            >
              {isEditing ? (
                <>
                  <SaveIcon size={16} />
                  Save changes
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Create mapping
                </>
              )}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
