export interface EventStream {
  id: number;
  account_id: string;
  enabled: boolean;
  platform: string;
  created_at: Date;
  updated_at: Date;
  config: {
    url?: string;
    headers?: string;
    body_template?: string;
    api_key: string;
    api_url: string;
  };
}

export enum AuthType {
  None = "none",
  Basic = "basic",
  Bearer = "bearer",
  Custom = "custom",
}
