---
description: Covers users, roles, auto-groups and service users. Use when the user asks who has access, what a role may do, why someone cannot log in, or about API tokens for automation.
---

# Team

**Users** (`list_users`): `role` sets dashboard power — owner > admin > network_admin /
billing_admin / auditor > user, who only sees their own devices. `auto_groups` are stamped on
every peer the user brings; blocked and pending-approval users can't get in. **Service users**
(`is_service_user: true`, no email, no login) hold API tokens for automation.
