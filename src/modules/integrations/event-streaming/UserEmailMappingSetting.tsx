import FancyToggleSwitch from "@components/FancyToggleSwitch";
import InlineLink from "@components/InlineLink";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { AtSignIcon, ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import {
  buildUserEmailMappingPayload,
  USER_EMAIL_MAPPING_DOC_LINK,
} from "@/modules/integrations/event-streaming/userEmailMapping";

type Props = {
  account: Account;
};

export const UserEmailMappingSetting = ({ account }: Props) => {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const [enabled, setEnabled] = useState(
    account.settings?.extra?.user_email_mapping_enabled ?? false,
  );

  const toggle = async (value: boolean) => {
    if (value) {
      const choice = await confirm({
        title: "Include user emails in streamed events?",
        description:
          "Emails are personal data. Streamed audit and traffic events will carry the email of the users they reference. Enable this only if your destination is allowed to store them.",
        confirmText: "Enable",
        cancelText: "Cancel",
        type: "default",
      });
      if (!choice) return;
    }

    notify({
      title: "User Emails",
      description: `User emails in streamed events successfully ${
        value ? "enabled" : "disabled"
      }.`,
      promise: saveRequest
        .put(buildUserEmailMappingPayload(account, value))
        .then(() => {
          setEnabled(value);
          mutate("/accounts");
        }),
      loadingMessage: "Updating user emails setting...",
    });
  };

  return (
    <div className={"mt-6"}>
      <FancyToggleSwitch
        value={enabled}
        onChange={toggle}
        data-testid="event-streaming-user-emails"
        label={
          <>
            <AtSignIcon size={15} />
            Include user emails
          </>
        }
        helpText={
          <>
            Add the email of the users referenced by an event (initiator, peer
            owner, target user) to streamed audit and traffic events. Emails are
            personal data; enable only if your destination is allowed to store
            them.{" "}
            <InlineLink
              href={USER_EMAIL_MAPPING_DOC_LINK}
              target={"_blank"}
              onClick={(e) => e.stopPropagation()}
            >
              Learn more
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </>
        }
        disabled={!permission.settings.update}
      />
    </div>
  );
};
