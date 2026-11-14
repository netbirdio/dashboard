import { Account } from "@/interfaces/Account";

export const USER_EMAIL_MAPPING_DOC_LINK =
  "https://docs.netbird.io/manage/activity/event-streaming#user-emails";

export const buildUserEmailMappingPayload = (
  account: Account,
  enabled: boolean,
) => ({
  id: account.id,
  settings: {
    ...account.settings,
    extra: {
      ...account.settings?.extra,
      user_email_mapping_enabled: enabled,
    },
  },
});
