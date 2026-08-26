import { TenantStatus } from "@/cloud/msp/interfaces/Tenant";

export interface MSP {
  id: string;
  activated_at: string;
  domain?: string;
  name: string;

  parent?: string;
  parent_name: string;
  parent_domain: string;

  parent_owner_name?: string;
  parent_owner_email?: string;

  status: TenantStatus;

  reseller_status?: "active" | "invited";
}
