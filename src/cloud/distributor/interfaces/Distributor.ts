import { Tenant } from "@/cloud/msp/interfaces/Tenant";

export interface Distributor {
  activated_at: string;
  domain: string;
  name: string;
  parent_owner_email: string;
  parent_owner_name: string;
}

export enum DistributorCustomerStatus {
  Existing = "existing",
  Invited = "invited",
  Active = "active",
}

export type DistributorCustomer = Pick<
  Tenant,
  "id" | "name" | "domain" | "activated_at"
> & {
  owner_email: string;
  has_reseller: boolean;
  invited_at?: string;
  reseller_customer_id?: string;
  status: DistributorCustomerStatus;
  tenant_number?: number;
};
