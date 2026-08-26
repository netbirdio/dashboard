export interface Invoice {
  id: string;
  period_start: string;
  period_end: string;
  type: "account" | "tenants";
}

export interface InvoicePDF {
  url: string;
}
