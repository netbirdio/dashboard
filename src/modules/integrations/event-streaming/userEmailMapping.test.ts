import { describe, expect, it } from "vitest";
import { Account } from "@/interfaces/Account";
import { buildUserEmailMappingPayload } from "@/modules/integrations/event-streaming/userEmailMapping";

const account = {
  id: "acc-1",
  settings: {
    extra: {
      peer_approval_enabled: true,
      user_approval_required: false,
      network_traffic_logs_enabled: true,
      network_traffic_packet_counter_enabled: true,
      network_traffic_logs_groups: ["g1"],
    },
    peer_login_expiration_enabled: true,
    peer_login_expiration: 86400,
  },
} as Account;

describe("buildUserEmailMappingPayload", () => {
  it("turns the setting on and keeps the other extra fields and settings", () => {
    const payload = buildUserEmailMappingPayload(account, true);
    expect(payload.id).toBe("acc-1");
    expect(payload.settings.extra).toEqual({
      ...account.settings.extra,
      user_email_mapping_enabled: true,
    });
    expect(payload.settings.peer_login_expiration).toBe(86400);
    expect(payload.settings.peer_login_expiration_enabled).toBe(true);
  });

  it("turns the setting off without touching the other fields", () => {
    const enabled = {
      ...account,
      settings: {
        ...account.settings,
        extra: { ...account.settings.extra, user_email_mapping_enabled: true },
      },
    } as Account;
    const payload = buildUserEmailMappingPayload(enabled, false);
    expect(payload.settings.extra).toEqual({
      ...account.settings.extra,
      user_email_mapping_enabled: false,
    });
  });

  it("does not mutate the account", () => {
    buildUserEmailMappingPayload(account, true);
    expect(account.settings.extra.user_email_mapping_enabled).toBeUndefined();
  });
});
