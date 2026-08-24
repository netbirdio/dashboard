---
description: Covers the account settings tabs: authentication and peer login expiration, setup keys, permissions, network range, client behaviour, notifications and account deletion. Use when the answer lives in settings, or when the user mentions login expiry, device approval, enrollment keys or notification channels.
---

# Settings

`get_account_settings` reads them; `open_page` `settings` with a `tab` opens them.
**Authentication** — peer login expiration (the clock behind `login_expired`), session and
inactivity expiration, device approval. **Setup keys** — enroll peers without interactive login:
reusable or one-off, expiring, `auto_groups` stamped on enrolled peers; `list_setup_keys` never
exposes the secret. **Groups** — user groups from JWT claims. **Permissions** — what regular users
may view. **Networks** — network range, DNS domain, IPv6. **Clients** — lazy connections, peer
expose, auto-update floor. **Metrics** — client telemetry. **Notifications** — email/webhook/Slack
channels for events like pending approvals or a routing peer disconnecting. **Danger zone** —
deletes the account; name the tab and stop.
